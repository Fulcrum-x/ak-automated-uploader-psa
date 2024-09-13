export type TmdbGenreList = TmdbGenre[];

interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbImageConfig {
  base_url: string;
  poster_sizes: string[];
}

export default class TmdbConfig {

  apiKey: string;
  imagesPromise?: Promise<TmdbImageConfig>;
  tvGenresPromise?: Promise<TmdbGenreList>;
  movieGenresPromise?: Promise<TmdbGenreList>;

  constructor() {
    this.apiKey = '';
  }

  async getConfig(): Promise<void> {

    this.imagesPromise = this.queryImages();
    this.tvGenresPromise = this.queryGenres('genre/tv/list');
    this.movieGenresPromise = this.queryGenres('genre/movie/list');

    await Promise.all([
      this.imagesPromise,
      this.tvGenresPromise,
      this.movieGenresPromise,
    ]);

  }

  async setApiKey(apiKey: string): Promise<void> {
    if (this.apiKey !== apiKey) {
      this.apiKey = apiKey;
      await this.getConfig();
    }
  }

  async query(endpoint: string, params: Record<string, string> = {}): Promise<Object> {

    try {

      const url = `https://api.themoviedb.org/3/${endpoint}?${new URLSearchParams(params)}`;

      const options = {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json;charset=utf-8',
        },
      };

      const response = await fetch(url, options);
      const data = await response.json();
      if (false === data instanceof Object) throw Error('Unexpected data type returned from TMDB');
      if ('success' in data && data.success === false) {
        throw Error('status_message' in data ? String(data.status_message) : 'TMDB query unsuccessful');
      }
      return data;

    } catch (error) {
      if (error instanceof Error) {
        throw Error(`Couldn't fetch ${endpoint} from the TMDB API: ${error.message}`);
      }
    }

    return {};

  }

  async queryImages(): Promise<TmdbImageConfig> {

    const data = await this.query('configuration');

    if (!('images' in data)) {
      throw Error("Couldn't get image configuration");
    }

    if (!(data.images instanceof Object)) {
      throw Error('Unexpected configuration data type');
    }

    if (!('base_url' in data.images) || typeof data.images.base_url !== 'string') {
      throw Error('Missing base URL from image configuration');
    }

    if (!('poster_sizes' in data.images) || !Array.isArray(data.images.poster_sizes)) {
      throw Error('Missing poster sizes from image configuration');
    }

    if (!data.images.poster_sizes.every(value => typeof value === 'string')) {
      throw Error('Unexpected data type in poster sizes');
    }

    return {
      base_url: data.images.base_url,
      poster_sizes: data.images.poster_sizes,
    }

  }

  async queryGenres(path: string): Promise<TmdbGenreList> {

    const output: TmdbGenreList = [];

    try {

      const data = await this.query(path);

      if (!('genres' in data)) {
        throw Error("Couldn't get genres");
      }
  
      if (!Array.isArray(data.genres)) {
        throw Error('Unexpected genre data type');
      }
  
      for (const genre of data.genres) {
  
        if ('id' in genre && typeof genre.id === 'number') {
          if ('name' in genre && typeof genre.name === 'string') {
            output.push({ id: genre.id, name: genre.name });
          }
        }
  
      }
  
      if (output.length < 1) {
        throw Error('No genres found');
      }
  
      return output;

    } catch (error) {
      throw error;
    }

  }

}