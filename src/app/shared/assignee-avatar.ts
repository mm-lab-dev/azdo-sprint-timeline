import { Component, input, signal } from "@angular/core";
import { Assignee } from "../domain/model";
@Component({
  selector: "app-assignee-avatar",
  standalone: true,
  template: `<span
    class="avatar"
    role="img"
    [attr.aria-label]="person().name"
    [title]="person().name"
    [style.background]="color()"
  >
    @if (person().imageUrl && failedUrl() !== person().imageUrl) {
      <img
        [src]="person().imageUrl"
        alt=""
        loading="lazy"
        referrerpolicy="no-referrer"
        (error)="failedUrl.set(person().imageUrl)"
      />
    } @else {
      <span>{{ initials() }}</span>
    }
  </span>`,
  styles: [
    `
      :host {
        display: inline-flex;
        flex-shrink: 0;
      }
      .avatar {
        display: inline-grid;
        place-items: center;
        width: 22px;
        height: 22px;
        border: 1px solid #ffffffc0;
        border-radius: 50%;
        overflow: hidden;
        color: white;
        font:
          600 10px "Segoe UI",
          sans-serif;
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    `,
  ],
})
export class AssigneeAvatar {
  readonly person = input.required<Assignee>();
  readonly failedUrl = signal<string | undefined>(undefined);
  initials() {
    return this.person().name === "未割当"
      ? "–"
      : this.person()
          .name.trim()
          .split(/\s+/)
          .map((s) => [...s][0])
          .slice(0, 2)
          .join("")
          .toLocaleUpperCase();
  }
  color() {
    let hash = 0;
    for (const ch of this.person().id)
      hash = (hash * 31 + ch.charCodeAt(0)) | 0;
    return `hsl(${Math.abs(hash) % 360} 42% 36%)`;
  }
}
