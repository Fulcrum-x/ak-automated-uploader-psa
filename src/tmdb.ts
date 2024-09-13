import { runInThisContext } from "node:vm";
import TmdbConfig, { TmdbGenreList } from "./tmdb-config";
import { errorString, normalize } from "./util";

export interface TmdbSearchResult {
  first_air_date: string;
  genre_ids: number[];
  genres: string[];
  id: number;
  imdb_id: string;
  keywords: string[];
  matched_name: string;
  name: string;
  origin_country: string[];
  original_language: string;
  original_name: string;
  overview: string;
  poster_path: string;
  poster_url: string;
  tmdb_id: number;
  tvdb_id: number;
}

export default class Tmdb {

  category: 'tv' | 'movie';
  config: TmdbConfig;
  searchResults: Map<string, TmdbSearchResult>;
  query: (endpoint: string, params?: Record<string, string>) => Promise<Object>;
  apiKey: string;
  matchedResult?: string;

  constructor(config: TmdbConfig) {

    this.searchResults = new Map();
    this.category = 'tv';
    this.config = config;
    this.query = config.query;
    this.apiKey = config.apiKey;

  }

  buildPossibleNamesFromResult(result: TmdbSearchResult): string[] {

    const possibleNames = [result.name, result.original_name];

    if (result.first_air_date.length > 0) {
      possibleNames.push(`${result.name} ${result.first_air_date.substring(0, 4)}`);
      possibleNames.push(`${result.original_name} ${result.first_air_date.substring(0, 4)}`);
    }

    if (result.origin_country.length > 0) {
      possibleNames.push(`${result.name} ${result.origin_country[0]}`);
      possibleNames.push(`${result.original_name} ${result.origin_country[0]}`);

      if (result.origin_country[0] === 'GB') {
        possibleNames.push(`${result.name} UK`);
        possibleNames.push(`${result.original_name} UK`);
      }
    }

    return possibleNames;

  }

  buildNameFromResult(result: TmdbSearchResult): string {

    let name = result.name;
    if (result.origin_country.length > 0) {
      name += ` (${result.origin_country[0]})`;
    }
    if (result.first_air_date !== '') {
      name += ` (${result.first_air_date.substring(0, 4)})`;
    }
    return name;

  }

  buildSearchOptions(title: string): { title: string; year?: string }[] {

    let queries: Array<{ title: string; year?: string }> = [];

    queries.push({ title });

    if (/\b&\b/.test(title)) {
      queries.push({ title: title.replace(/\b&\b/ig, 'and') });
    }

    if (/\band\b/i.test(title)) {
      queries.push({ title: title.replace(/\band\b/i, '&') });
    }

    const yearQueries: Array<{ title: string; year: string }> = [];
    for (const query of queries) {

      let matches = query.title.match(/^(.+?) +\(?([0-9]{4})\)?$/);
      if (matches) {
        yearQueries.push({
          title: matches[1],
          year: matches[2],
        });
      }

    }

    queries = queries.concat(yearQueries);

    return queries;

  }

  async getExternalIds(id: number): Promise<{ imdb_id?: string; tvdb_id?: number }> {
    const ids = await this.query(`${this.category}/${id}/external_ids`);
    return {
      imdb_id: 'imdb_id' in ids ? String(ids.imdb_id) : '',
      tvdb_id: 'tvdb_id' in ids ? Number(ids.tvdb_id) : 0,
    }
  }

  async getKeywords(id: number): Promise<string[]> {

    try {

      const keywords = await this.query(`${this.category}/${id}/keywords`);

      switch (this.category) {

        case 'tv':

          if (!('results' in keywords) || !Array.isArray(keywords.results)) {
            throw Error("Couldn't find results when searching for keywords");
          }

          if (!keywords.results.every(value => 'name' in value)) {
            throw Error('Unexpected values when searching for keywords');
          }

          return keywords.results.map(value => String(value.name));

        case 'movie':

          if (!('keywords' in keywords) || !Array.isArray(keywords.keywords)) {
            throw Error("Couldn't find results when searching for keywords");
          }

          if (!keywords.keywords.every(value => 'name' in value)) {
            throw Error('Unexpected values when searching for keywords');
          }

          return keywords.keywords.map(value => String(value.name));

      }

    } catch {
      throw Error(`Couldn't get keywords for TMDB ID ${id}`);
    }

  }

  async getGenresFromIds(genreIds: number[]): Promise<string[]> {

    let genreTable: TmdbGenreList;

    switch (this.category) {

      case 'tv':

        if (undefined === this.config.tvGenresPromise) {
          throw Error('Waiting for TV genres from TMDB');
        }
        genreTable = await this.config.tvGenresPromise;
        break;

      case 'movie':

        if (undefined === this.config.movieGenresPromise) {
          throw Error('Waiting for movie genres from TMDB');
        }
        genreTable = await this.config.movieGenresPromise;
        break;

    }

    const genres: string[] = [];

    for (const genreId of genreIds) {
      const genre = genreTable.find(genre => genre.id === genreId);
      if (undefined !== genre) {
        genres.push(genre.name);
      }
    }

    return genres;

  }

  async getPosterSize(minWidth: number): Promise<string> {

    try {

      if (!this.config.imagesPromise) {
        throw Error('Waiting for image configuration from TMDB');
      }

      const imageConfig = await this.config.imagesPromise;

      let size: number | undefined;

      for (const posterSize of imageConfig.poster_sizes) {

        let matches: RegExpMatchArray | null;
        if ((matches = posterSize.match(/^w([0-9]+)$/i)) !== null) {
          let matchedSize = Number(matches[1]);
          if (matchedSize >= minWidth && (!size || matchedSize <= size)) {
            size = matchedSize;
          }
        }

      }

      return size ? `w${size}` : 'original';

    } catch (error) {
      throw error;
    }

  }

  async getPosterUrl(posterPath: string): Promise<string> {

    try {

      if (!this.config.imagesPromise) {
        throw Error('Waiting for image configuration from TMDB');
      }

      if (posterPath === '') {
        return '';
      }

      const baseUrl = (await this.config.imagesPromise).base_url;
      const posterSize = await this.getPosterSize(500);

      return baseUrl + posterSize + posterPath;

    } catch(error) {
      if (error instanceof Error) {
        throw Error(`Failed to get poster URL: ${error.message}`);
      }
    }

    return '';

  }

  async getResult(name: string): Promise<TmdbSearchResult | undefined> {

    const result = this.searchResults.get(name);
    if (!result) return undefined;

    if (result.tmdb_id) return result;

    const genres = this.getGenresFromIds(result.genre_ids);
    const posterUrl = this.getPosterUrl(result.poster_path);
    const externalIds = this.getExternalIds(result.id);
    const keywords = this.getKeywords(result.id);

    result.tmdb_id = result.id;
    result.genres = await genres;
    result.poster_url = await posterUrl;
    Object.assign(result, await externalIds);
    result.keywords = await keywords;


    return result;

  }

  async querySearchMovie(title: string): Promise<TmdbSearchResult[]> {

    const queries = this.buildSearchOptions(title);

    const promises: Promise<Object>[] = [];

    try {

      for (const query of queries) {

        let promise: Promise<object> | undefined;

        if (query.year) {

          promise = this.query('search/movie', {
            query: query.title,
            primary_release_year: query.year
          });

        } else {

          promise = this.query('search/movie', {
            query: query.title
          });

        }

        promises.push(promise);

      }

    } catch (error) {
      throw Error(errorString(`Failed searching TMDB for ${title}`, error));
    }

    const eachResults = await Promise.all(promises);

    const results: Object[] = [];

    for (const eachResult of eachResults) {
      if ('results' in eachResult && Array.isArray(eachResult.results)) {
        results.push(...eachResult.results);
      }
    }

    const output: TmdbSearchResult[] = [];

    for (const result of results) {

      const resultString = (key: string): string => {
        if (key in result && typeof key === 'string') {
          return result[key];
        }
        return '';
      };

      const id = 'id' in result ? Number(result.id) : 0;

      const firstAirDate = resultString('release_date');
      const name = resultString('title');
      const originalLanguage = resultString('original_language');
      const originalName = resultString('original_title');
      const overview = resultString('overview');
      const posterPath = resultString('poster_path');

      let genreIds: number[] = [];
      if (
        'genre_ids' in result && 
        Array.isArray(result.genre_ids) && 
        result.genre_ids.every(value => typeof value === 'number')
      ) {
        genreIds = result.genre_ids;
      }

      output.push({
        first_air_date: firstAirDate,
        genre_ids: genreIds,
        genres: [],
        id: id,
        imdb_id: '',
        keywords: [],
        matched_name: '',
        name: name,
        origin_country: [],
        original_language: originalLanguage,
        original_name: originalName,
        overview: overview,
        poster_path: posterPath,
        poster_url: '',
        tmdb_id: 0,
        tvdb_id: 0,
      });

    }

    return output;

  }

  async querySearchSeries(series: string): Promise<TmdbSearchResult[]> {

    const queries = this.buildSearchOptions(series);

    const promises: Promise<Object>[] = [];

    try {

      for (const query of queries) {

        let promise: Promise<Object> | undefined;

        if (query.year) {

          promise = this.query('search/tv', {
            query: query.title,
            first_air_date_year: query.year,
          });

        } else {

          promise = this.query('search/tv', {
            query: query.title,
          });

        }

        promises.push(promise);

      }

    } catch (error) {
      if (error instanceof Error) {
        throw Error(`Failed searching TMDB for ${series}: ${error.message}`);
      }
    }

    const eachResults = await Promise.all(promises);

    const results: Object[] = [];

    for (const eachResult of eachResults) {
      if ('results' in eachResult && Array.isArray(eachResult.results)) {
        results.push(...eachResult.results);
      }
    }

    const output: TmdbSearchResult[] = [];

    for (const result of results) {

      const resultString = (key: string): string => {
        if (key in result) {
          if (typeof key === 'string') {
            return result[key];
          }
        }
        return '';
      };

      const id = 'id' in result ? Number(result.id) : 0;

      const firstAirDate = resultString('first_air_date');
      const name = resultString('name');
      const originalLanguage = resultString('original_language');
      const originalName = resultString('original_name');
      const overview = resultString('overview');
      const posterPath = resultString('poster_path');

      let genreIds: number[] = [];
      if (
        'genre_ids' in result &&
        Array.isArray(result.genre_ids) &&
        result.genre_ids.every(value => typeof value === 'number')
      ) {
        genreIds = result.genre_ids;
      }

      let originCountry: string[] = [];
      if (
        'origin_country' in result &&
        Array.isArray(result.origin_country) &&
        result.origin_country.every(value => typeof value === 'string')
      ) {
        originCountry = result.origin_country;
      }

      output.push({
        first_air_date: firstAirDate,
        genre_ids: genreIds,
        genres: [],
        id: id,
        imdb_id: '',
        keywords: [],
        matched_name: '',
        name: name,
        origin_country: originCountry,
        original_language: originalLanguage,
        original_name: originalName,
        overview: overview,
        poster_path: posterPath,
        poster_url: '',
        tmdb_id: 0,
        tvdb_id: 0,
      });

    }

    return output;

  }

  async searchMovie(title: string): Promise<string[]> {

    this.category = 'movie';

    if (title === '') return [];

    this.searchResults.clear();
    this.matchedResult = undefined;

    const results = await this.querySearchMovie(title);

    let found = false;

    for (const result of results) {

      const name = this.buildNameFromResult(result);
      this.searchResults.set(name, result);

      if (found) continue;

      const possibleNames = this.buildPossibleNamesFromResult(result);

      for (const possibleName of possibleNames) {
        if (normalize(title) === normalize(possibleName)) {
          found = true;
          result.matched_name = possibleName;
          this.matchedResult = name;
          break;
        }
      }

    }

    return [...this.searchResults.keys()];

  }

  /**
   * Searches TMDB for a TV series
   * @param series The series to search for, works with a name like "Doctor Who 2005" "Hells Kitchen US"
   * @returns An array of identifying TV show strings, like "Doctor Who (2005) (UK)" "Hell's Kitchen (2005) (US)"
   */

  async searchSeries(series: string): Promise<string[]> {

    this.category = 'tv';

    if (series === '') return [];

    this.searchResults.clear();
    this.matchedResult = undefined;

    const results = await this.querySearchSeries(series);

    let found = false;

    for (const result of results) {

      const name = this.buildNameFromResult(result);
      this.searchResults.set(name, result);

      if (found) continue;

      const possibleNames = this.buildPossibleNamesFromResult(result);

      for (const possibleName of possibleNames) {
        if (normalize(series) === normalize(possibleName)) {
          found = true;
          result.matched_name = possibleName;
          this.matchedResult = name;
          break;
        }
      }

    }

    return [...this.searchResults.keys()];

  }

}