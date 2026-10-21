#!/usr/bin/env python3
"""スライドに「控えめな動き」を付ける：画面切り替え（フェード）と、要素の段階表示（フェードイン）。

段階表示の対象は、図形の名前（pptxgenjs の objectName）が  b<番号>|  で始まるもの。
  例: objectName: "b1|step 1", "b1|step 1 text", "b2|step 2" ...
同じ番号は同時に表示され、番号の小さい順にクリックで1グループずつ表示される。
名前に b<番号>| が無い図形は最初から表示されたまま。

  python3 add_motion.py in.pptx out.pptx                  # 全スライドにフェード切り替え＋段階表示
  python3 add_motion.py in.pptx out.pptx --transition none # 切り替えなし
  python3 add_motion.py in.pptx out.pptx --chain           # 1クリックで全グループを順番に自動表示
  python3 add_motion.py in.pptx out.pptx --no-build        # 段階表示を付けない（切り替えのみ）

方針（references/motion.md）:
- 動きは「話の順番どおりに見せる」ためだけに使う。飾りの動きは使わない。
- 効果はフェードだけ、時間は短く（既定 0.4 秒）、全スライドで統一する。
- 最終状態（すべて表示された状態）が完成形になるように作る。PDF・印刷ではこの状態になる。
"""
import argparse
import itertools
import re
import shutil
import zipfile

from lxml import etree

NS = {"p": "http://schemas.openxmlformats.org/presentationml/2006/main",
      "a": "http://schemas.openxmlformats.org/drawingml/2006/main"}
P = "{%s}" % NS["p"]
BUILD = re.compile(r"^b(\d+)\|")


def effect(ids, spid, node_type, dur):
    c, s, e = next(ids), next(ids), next(ids)
    return (f'<p:par><p:cTn id="{c}" presetID="10" presetClass="entr" presetSubtype="0" fill="hold" grpId="0" nodeType="{node_type}">'
            f'<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
            f'<p:set><p:cBhvr><p:cTn id="{s}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
            f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>'
            f'<p:to><p:strVal val="visible"/></p:to></p:set>'
            f'<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="{e}" dur="{dur}"/>'
            f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr></p:animEffect>'
            f'</p:childTnLst></p:cTn></p:par>')


def timing_xml(groups, chain, dur):
    """groups: [[(spid, kind), ...], ...]  クリック順のグループ"""
    ids = itertools.count(3)
    clicks = [groups] if chain else [[g] for g in groups]
    out = []
    for click in clicks:
        outer, inner_pars = next(ids), []
        for k, grp in enumerate(click):
            inner = next(ids)
            first_type = "clickEffect" if k == 0 else "afterEffect"
            effs = "".join(effect(ids, spid, first_type if i == 0 else "withEffect", dur)
                           for i, (spid, _) in enumerate(grp))
            inner_pars.append(f'<p:par><p:cTn id="{inner}" fill="hold"><p:stCondLst><p:cond delay="{k * dur}"/></p:stCondLst>'
                              f'<p:childTnLst>{effs}</p:childTnLst></p:cTn></p:par>')
        out.append(f'<p:par><p:cTn id="{outer}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst>'
                   f'<p:childTnLst>{"".join(inner_pars)}</p:childTnLst></p:cTn></p:par>')
    bld = []
    for grp in groups:
        for spid, kind in grp:
            if kind == "sp":
                bld.append(f'<p:bldP spid="{spid}" grpId="0" animBg="1"/>')
            elif kind == "graphicFrame":
                bld.append(f'<p:bldGraphic spid="{spid}" grpId="0"><p:bldAsOne/></p:bldGraphic>')
    bld_xml = f"<p:bldLst>{''.join(bld)}</p:bldLst>" if bld else ""
    return (f'<p:timing xmlns:p="{NS["p"]}"><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
            f'<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>{"".join(out)}</p:childTnLst></p:cTn>'
            f'<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
            f'<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>'
            f'</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>{bld_xml}</p:timing>')


def patch_slide(xml: bytes, transition: str, build: bool, chain: bool, dur: int):
    root = etree.fromstring(xml)
    for tag in ("transition", "timing"):
        for el in root.findall(P + tag):
            root.remove(el)
    # 挿入位置: cSld, clrMapOvr の直後（extLst より前）
    anchor = root.find(P + "clrMapOvr")
    if anchor is None:
        anchor = root.find(P + "cSld")
    pos = list(root).index(anchor) + 1
    n_build = 0
    if build:
        groups = {}
        for nv in root.iter(P + "cNvPr"):
            m = BUILD.match(nv.get("name", ""))
            if not m:
                continue
            shape = nv.getparent().getparent()          # p:nvSpPr -> p:sp など
            kind = etree.QName(shape).localname
            groups.setdefault(int(m.group(1)), []).append((nv.get("id"), kind))
        if groups:
            ordered = [groups[k] for k in sorted(groups)]
            root.insert(pos, etree.fromstring(timing_xml(ordered, chain, dur)))
            n_build = len(ordered)
    if transition != "none":
        speed = "fast" if dur <= 300 else "med"
        root.insert(pos, etree.fromstring(f'<p:transition xmlns:p="{NS["p"]}" spd="{speed}"><p:{transition}/></p:transition>'))
    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True), n_build


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--transition", default="fade", choices=["fade", "push", "wipe", "none"])
    ap.add_argument("--no-build", action="store_true", help="段階表示を付けない")
    ap.add_argument("--chain", action="store_true", help="1クリックで全グループを順番に表示")
    ap.add_argument("--duration", type=int, default=400, help="フェードの時間（ミリ秒）")
    a = ap.parse_args()
    tmp = a.dst + ".tmp"
    report = []
    with zipfile.ZipFile(a.src) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if re.fullmatch(r"ppt/slides/slide\d+\.xml", item.filename):
                data, n = patch_slide(data, a.transition, not a.no_build, a.chain, a.duration)
                if n:
                    report.append(f"{item.filename}: {n}段階")
            zout.writestr(item, data)
    shutil.move(tmp, a.dst)
    print(f"切り替え: {a.transition} / 段階表示: " + (", ".join(report) if report else "なし"))


if __name__ == "__main__":
    main()
