export type NewsArticle = {
  id: string;
  source: string;
  title: string;
  link: string;
  image: string | null;
  published_at: string;
  fetched_at: string;
};

export type NewsRefreshLog = {
  run_id: string;
  started_at: string;
  completed_at: string | null;
  sources: string[];
  articles_found: number;
  articles_imported: number;
  duplicates: number;
  errors: string[];
};
