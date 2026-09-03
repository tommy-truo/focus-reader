import { defineConfig } from "wxt";

const icons = {
  16: "/icons/icon16.png",
  32: "/icons/icon32.png",
  48: "/icons/icon48.png",
  128: "/icons/icon128.png",
};

export default defineConfig({
  srcDir: "src",
  manifest: {
    name: "Focus Reader",
    description:
      "Read selected page text one chunk at a time in a full-page overlay.",
    minimum_chrome_version: "120",
    permissions: ["scripting", "activeTab", "contextMenus", "storage"],
    action: {
      default_title: "Read with Focus Reader",
      default_icon: icons,
    },
    icons,
  },
  webExt: {
    disabled: true,
  },
});
