#!/usr/bin/env python3
"""pptxgenjs で書き出した .pptx のテーマに、配色と日本語フォントを書き込む。

pptxgenjs はテーマの色を Office 既定のまま書き出し、日本語用フォント（ea / Jpan）も
空のままにする。そのままだと PowerPoint では日本語が「游ゴシック Light」などで表示され、
改行位置もプレビューとずれる。このスクリプトでテーマを上書きする。

使い方:
  python3 finalize_pptx.py deck.pptx --font "BIZ UDPGothic" --colors '{"dk1":"232F3E", ...}' --name "Navy"
"""
import argparse
import json
import re
import shutil
import zipfile

KEYS = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3",
        "accent4", "accent5", "accent6", "hlink", "folHlink"]


def patch_theme(xml: str, colors: dict, font: str, name: str) -> str:
    for key, val in colors.items():
        if key in KEYS:
            xml = re.sub(rf"<a:{key}>.*?</a:{key}>",
                         f'<a:{key}><a:srgbClr val="{val.lstrip("#").upper()}"/></a:{key}>', xml, flags=re.S)
    if name:
        xml = re.sub(r'(<a:(?:theme|clrScheme|fontScheme)\b[^>]*?\bname=")[^"]*"', rf"\g<1>{name}\"", xml)
    if font:
        def fix(block: str) -> str:
            block = re.sub(r'<a:latin typeface="[^"]*"', f'<a:latin typeface="{font}"', block)
            block = re.sub(r'<a:ea typeface="[^"]*"', f'<a:ea typeface="{font}"', block)
            return re.sub(r'<a:font script="Jpan" typeface="[^"]*"/>', f'<a:font script="Jpan" typeface="{font}"/>', block)
        xml = re.sub(r"<a:(majorFont|minorFont)>.*?</a:\1>", lambda m: fix(m.group(0)), xml, flags=re.S)
    return xml


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pptx")
    ap.add_argument("--colors", default="{}", help="テーマ色のJSON（dk1, lt1, dk2, lt2, accent1-6, hlink, folHlink）")
    ap.add_argument("--font", default="BIZ UDPGothic")
    ap.add_argument("--name", default="")
    a = ap.parse_args()
    colors = json.loads(a.colors)
    tmp = a.pptx + ".tmp"
    with zipfile.ZipFile(a.pptx) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename.startswith("ppt/theme/") and item.filename.endswith(".xml"):
                data = patch_theme(data.decode("utf-8"), colors, a.font, a.name).encode("utf-8")
            zout.writestr(item, data)
    shutil.move(tmp, a.pptx)


if __name__ == "__main__":
    main()
