import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import rssPlugin from "@11ty/eleventy-plugin-rss";
import { EleventyI18nPlugin } from "@11ty/eleventy";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(rssPlugin);
  eleventyConfig.addPlugin(EleventyI18nPlugin, { defaultLanguage: "es" });

  eleventyConfig.addFilter("getTranslations", function (allPages, translationKey, currentLang) {
    if (!translationKey) return [];
    return allPages.filter(
      (page) => page.data.translationKey === translationKey && page.data.lang !== currentLang
    );
  });

  eleventyConfig.addFilter("postsByLang", function (collection, lang) {
    return collection.filter((p) => p.data.lang === lang);
  });

  eleventyConfig.addPassthroughCopy("src/assets");

  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return new Date(dateObj).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
