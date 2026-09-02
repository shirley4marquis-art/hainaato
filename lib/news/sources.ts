// Dedicated China-auto RSS feeds — both cover exports/policy/EVs directly, so
// no keyword filtering is needed the way the made-in-china importer needs
// category/brand filters over a general marketplace.
export const NEWS_SOURCES = [
  { name: "CarNewsChina", feedUrl: "https://carnewschina.com/feed/" },
  { name: "CnEVPost", feedUrl: "https://cnevpost.com/feed/" },
] as const;

export const NEWS_USER_AGENT = "HainaAutoNewsBot/1.0 (+https://www.nindgeauto.com; news-syndication)";
