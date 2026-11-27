import { bootstrapApplication } from "@angular/platform-browser";
import { providePrimeNG } from "primeng/config";
import Aura from "@primeuix/themes/aura";
import { App, MOCK_MODE, REPOSITORY } from "./app/features/execution-plan/app";
import { MockRepository } from "./app/data/mock-repository";

async function main() {
  const params = new URLSearchParams(location.search);
  const mock = window.self === window.top || params.get("mock") === "1";
  const repository = mock
    ? new MockRepository(params.get("scenario") || "")
    : await (await import("./app/core/azure-devops/bootstrap")).connect();
  await bootstrapApplication(App, {
    providers: [
      providePrimeNG({ theme: { preset: Aura } }),
      { provide: REPOSITORY, useValue: repository },
      { provide: MOCK_MODE, useValue: mock },
    ],
  });
  if (!mock)
    await (await import("azure-devops-extension-sdk")).notifyLoadSucceeded();
}
void main().catch(async () => {
  document.body.textContent =
    "初期化に失敗しました。Azure DevOpsの拡張Hubから再読み込みしてください。";
  if (window.self !== window.top)
    await (
      await import("azure-devops-extension-sdk")
    ).notifyLoadFailed("Extension initialization failed");
});
