# 決定記録

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
