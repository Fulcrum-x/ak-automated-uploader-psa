import TmdbPanel from "../gui/tmdb-panel";
import Tmdb, { TmdbSearchResult } from "../tmdb";

export default class TmdbController {

  tmdb: Tmdb;
  ui: TmdbPanel;
  metadataCallback?: (data: any) => void;

  constructor(ui, tmdbConfig) {
    this.tmdb = new Tmdb(tmdbConfig);
    this.ui = ui;
  }

  emitMetadata(data: TmdbSearchResult): void {
    if (this.metadataCallback) {
      this.metadataCallback(data);
    }
  }

  onMetadata(callback: (data: TmdbSearchResult) => void): void {
    this.metadataCallback = callback;
  }

  async searchMovie(title: string): Promise<void> {
    
    const results = await this.tmdb.searchMovie(title);

    this.ui.addResults(results);

    this.ui.onSelected(async name => {
      const metadata = await this.tmdb.getResult(name);
      if (metadata && metadata.poster_url) {
        this.ui.setPoster(metadata.poster_url);
        this.emitMetadata(metadata);
      }
    });

    if (this.tmdb.matchedResult) {
      this.ui.selectResult(this.tmdb.matchedResult);
    }

  }

  async searchSeries(series: string): Promise<void> {

    const results = await this.tmdb.searchSeries(series);
    
    this.ui.addResults(results);

    this.ui.onSelected(async name => {
      const metadata = await this.tmdb.getResult(name);
      if (metadata && metadata.poster_url) {
        this.ui.setPoster(metadata.poster_url);
        this.emitMetadata(metadata);
      }
    });

    if (this.tmdb.matchedResult) {
      this.ui.selectResult(this.tmdb.matchedResult);
    }

  }

}