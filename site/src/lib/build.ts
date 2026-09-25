// ビルドごとに変わる識別子。キャッシュさせたくないファイル(検索インデックス等)のURLに ?v= で付ける。
export const BUILD_ID = Date.now().toString(36);
