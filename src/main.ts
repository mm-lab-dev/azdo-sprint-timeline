import { bootstrapApplication } from "@angular/platform-browser";
import { providePrimeNG } from "primeng/config";
import Aura from "@primeuix/themes/aura";
import {
  App,
  FILTER_SCOPE,
  MOCK_MODE,
  REPOSITORY,
} from "./app/features/execution-plan/app";
import { FilterScope } from "./app/preferences/filter-preferences";
import { MockRepository } from "./app/data/mock-repository";
import { Localization } from "./app/i18n/localization";

const i18n = new Localization();

async function main() {
  const params = new URLSearchParams(location.search);
  const mock = window.self === window.top || params.get("mock") === "1";
  let filterScope: FilterScope = {
    hostId: "mock",
    projectId: "demo",
    userId: "local",
  };
  const repository = mock
    ? new MockRepository(params.get("scenario") || "")
    : await (
        await import("./app/core/azure-devops/bootstrap")
      ).connect(
        (culture) => i18n.setCulture(culture),
        (scope) => {
          filterScope = scope;
        },
      );
  await bootstrapApplication(App, {
    providers: [
      providePrimeNG({ theme: { preset: Aura } }),
      { provide: REPOSITORY, useValue: repository },
      { provide: MOCK_MODE, useValue: mock },
      { provide: Localization, useValue: i18n },
      { provide: FILTER_SCOPE, useValue: filterScope },
    ],
  });
  if (!mock)
    await (await import("azure-devops-extension-sdk")).notifyLoadSucceeded();
}
void main().catch(async () => {
  document.body.textContent = i18n.t("initializationError");
  if (window.self !== window.top)
    await (
      await import("azure-devops-extension-sdk")
    ).notifyLoadFailed(i18n.t("initializationError"));
});
