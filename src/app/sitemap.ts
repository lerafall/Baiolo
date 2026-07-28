import type { MetadataRoute } from "next";
import { projects } from "@/lib/data/projects";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://baiolo.com";
  const staticRoutes = [
    "",
    "/explore",
    "/create",
    "/projects",
    "/favorites",
    "/this-week",
    "/safety",
    "/make",
    "/auth",
    "/onboarding",
    "/profile",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  const projectRoutes = projects.map((p) => ({
    url: `${base}/project/${p.id}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...projectRoutes];
}
