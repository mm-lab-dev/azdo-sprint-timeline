import * as SDK from "azure-devops-extension-sdk";
import {
  CommonServiceIds,
  ILocationService,
  IProjectPageService,
} from "azure-devops-extension-api/Common";
import {
  IWorkItemFormNavigationService,
  WorkItemTrackingServiceIds,
  WorkItemTrackingRestClient,
} from "azure-devops-extension-api/WorkItemTracking";
import { AzureRepository } from "../../data/azure-repository";
import { ReadOnlyHttp } from "./http";
import { FilterScope } from "../../preferences/filter-preferences";
export async function connect(
  setCulture: (culture?: string) => void = () => {},
  setFilterScope: (scope: FilterScope) => void = () => {},
): Promise<AzureRepository> {
  const applyHostTheme = () => {
    const value = getComputedStyle(document.body)
      .getPropertyValue("--background-color")
      .trim();
    const sample = document.createElement("span");
    sample.style.color = value || "#ffffff";
    document.body.appendChild(sample);
    const rgb = getComputedStyle(sample)
      .color.match(/[\d.]+/g)
      ?.slice(0, 3)
      .map(Number);
    sample.remove();
    document.documentElement.dataset["hostTheme"] =
      rgb && rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 < 128
        ? "dark"
        : "light";
  };
  window.addEventListener("themeApplied", applyHostTheme);
  await SDK.init({ loaded: false, applyTheme: true });
  await SDK.ready();
  setCulture(SDK.getPageContext()?.globalization?.culture);
  applyHostTheme();
  const page = await SDK.getService<IProjectPageService>(
    CommonServiceIds.ProjectPageService,
  );
  const project = await page.getProject();
  if (!project) throw new Error("Project context required");
  setFilterScope({
    hostId: SDK.getHost().id,
    projectId: project.id,
    userId: SDK.getUser().id,
  });
  const location = await SDK.getService<ILocationService>(
    CommonServiceIds.LocationService,
  );
  const base = await location.getResourceAreaLocation(
    WorkItemTrackingRestClient.RESOURCE_AREA_ID,
  );
  const http = new ReadOnlyHttp(base, () => SDK.getAccessToken());
  return new AzureRepository(http, project, async (id) => {
    const service = await SDK.getService<IWorkItemFormNavigationService>(
      WorkItemTrackingServiceIds.WorkItemFormNavigationService,
    );
    await service.openWorkItem(id);
  });
}
