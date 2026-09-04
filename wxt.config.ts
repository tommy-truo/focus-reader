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
    homepage_url: "https://github.com/tommy-truo/focus-reader",
    minimum_chrome_version: "120",
    permissions: ["scripting", "activeTab", "contextMenus", "storage"],
    action: {
      default_title: "Read with Focus Reader",
      default_icon: icons,
    },
    icons,
  },
  hooks: {
    "build:manifestGenerated": (_wxt, manifest) => {
      // Overlay is injected on toolbar / context-menu click via activeTab +
      // scripting. WXT still copies content-script matches into host_permissions;
      // drop them so the store listing does not request all http(s) sites.
      delete manifest.host_permissions;
    },
  },
  webExt: {
    disabled: true,
  },
});
