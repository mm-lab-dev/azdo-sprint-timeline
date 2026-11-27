# 決定記録

- 既定ではFeatureを上端とし、Epicのチェック時だけEpicまで祖先を取得・集約する。選択したEpic/Feature/US/Taskだけで表示ツリーを投影し、非選択の中間階層を飛ばす。表示選択・折りたたみ・フィルターは元の期間集約を変えない。取得漏れと階層の注意を別表示にし、表示範囲外のSprint設定は情報として扱う。
- 同じ種類・同じ実際の親・完全一致タイトルの項目だけを表示行として統合する。親なし同士も対象。表示上の親が同じになっても元の親が異なる項目は統合しない。元ID・担当者・状態・Sprint・期間は保持し、統合行やセルから各IDへ遷移できるようにする。
- 状態・担当者はチェックボックスの複数選択。同じフィルター内はOR、種類の異なるフィルター間はAND。nullは全選択、空配列は全解除とし、未割当担当者も選択可能。担当者の識別はIDを優先し、画像が取れなければ頭文字を表示する。
- 斜線は取得したTaskがないSprintを示す。Taskが一つもないUSも、自身のSprintに斜線で表示する。親・統合行も同じ基準とし、表示階層の省略で判定を変えない。
- 完了率はユーザー指定の `(Original − Remaining) / Original × 100`。標準フィールド`Microsoft.VSTS.Scheduling.OriginalEstimate`と`Microsoft.VSTS.Scheduling.RemainingWork`を使用する。親と統合行は工数を加算し、割合の単純平均や親の二重計上はしない。負値・100%超は数値を維持し、描画だけをバー内に収める。見積未設定・0なら割合を表示せず、不足項目を除いた参考値には*を付す。％はバーの端に小さな文字で添える。

- 0.1.1: ブラウザーの標準fetchはクライアントオブジェクトをthisとして呼び出すと`Illegal invocation`になるため、`globalThis.fetch`を呼ぶラッパーで保持する。Node/モックのみでは検出できなかったため、実SDKのiframe起動から標準fetch・Team選択まで通すE2Eを追加。チーム一覧0件はWork Itemの空結果と区別し、更新で一覧取得から再試行する。

- 公開用構成は`3mf-gcode-preview`を参考に、画像付きREADME・CHANGELOG・SUPPORT・TESTING・PUBLISHING・MITライセンス・第三者表記へ分離。拡張ID/npm名/Angularプロジェクト名/配布パスはユーザー指定の`azdo-sprint-timeline`に統一。表示名はユーザー指定のSprint Timelineに更新。
- publisherは`mm-lab`、リポジトリは`mm-lab-dev/azdo-sprint-timeline`をユーザー確認済みの設定として反映。指定されたGitHubリポジトリをoriginに設定。初版企画書は名称・拡張IDのみ更新し、機能仕様は維持する。
- 配布方式は一般公開。manifestの`public:true`は公開用パッケージの設定であり、アップロード・公開操作は未実施。配布先組織の指定・固有の組織名・ローカル絶対パスをソースや配布物に含めない。

- 既存アプリ構成なし。Angular 21.2 / PrimeNG 21.1の同一メジャーを選択。npm lockfileで固定する。
- Sprint列は日付間隔に依存せず等幅。日付はISO日付の先頭10文字で比較し、タイムゾーン変換をしない。
- US自身の有効なIterationは補助的に和集合へ含める。子Taskが別Sprintにある場合も必ず期間へ反映する。Feature自身のIterationは無視する。
- SDK 4.2.0 / extension-api 5.281.0に固定。最新SDK 5はextension-apiのpeerDependencies（^2 / ^3 / ^4）外なので採用しない。
- SDKクライアントを先に調査したが、この版の生成済みクライアントは7.2-previewを使い、Fetch.jsの例外がRetry-Afterヘッダーを保持しない。そのため取得層はSDK認証を使うREST 7.1アダプターとし、APIパッケージの型で契約を確認。SDKはプロジェクト・Location取得、テーマ通知、認証、フォーム遷移に使用する。
- チーム一覧は読み取り用 `vso.project`、Work/WITは `vso.work`。PAT・外部バックエンド・テレメトリなし。
- Work ItemのRelations展開ではfields指定と併用しない（API互換性のため）。本文等を永続化・ログ出力しない。
- WIQLはSprintごとに実行し、上限に達したSprintは部分取得警告と範囲縮小案内。文字列リテラルは引用符をエスケープし、Area includeChildrenを反映。
- APIは同時実行を抑える逐次バッチ。429/一時的5xxを最大3回再試行。Retry-Afterの秒数/HTTP日付に対応。60秒超の指定は即座にエラー表示し、指定時刻より早く再試行しない。

## 公式資料（2026-11-27確認）

- [SDK RESTクライアント](https://learn.microsoft.com/en-us/azure/devops/extend/develop/call-rest-api?view=azure-devops)
- [Hub追加](https://learn.microsoft.com/en-us/azure/devops/extend/develop/add-hub?view=azure-devops)
- [認証](https://learn.microsoft.com/en-us/azure/devops/extend/develop/auth?view=azure-devops)
- [Teams: ページングとvso.project](https://learn.microsoft.com/en-us/rest/api/azure/devops/core/teams/get-teams?view=azure-devops-rest-7.1)
- [Iterations: timeframe省略で全チームSprint](https://learn.microsoft.com/en-us/rest/api/azure/devops/work/iterations/list?view=azure-devops-rest-7.1)
- [Area設定](https://learn.microsoft.com/en-us/rest/api/azure/devops/work/teamfieldvalues/get?view=azure-devops-rest-7.1)
- [最大200件・Omit・Relations](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/get-work-items-batch?view=azure-devops-rest-7.1)
- [WIQL](https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax?view=azure-devops)
