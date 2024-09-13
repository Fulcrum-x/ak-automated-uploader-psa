import { categories, distributors, frees, regions, resolutions, types } from "../../trackers/aither";
import TrackerForm from "./tracker-form";

export default class AitherForm extends TrackerForm {

  constructor() {

    super();

    this.addLabel('name', 'Title:', 0, 0);
    this.addLineEdit('name', 0, 1, 7);

    this.addLabel('category_id', 'Category:', 1, 0);
    this.addComboBox('category_id', categories, 1, 1);

    this.addLabel('type_id', 'Type:', 1, 2);
    this.addComboBox('type_id', types, 1, 3);

    this.addLabel('resolution_id', 'Resolution:', 1, 4);
    this.addComboBox('resolution_id', resolutions, 1, 5);

    this.addLabel('distributor_id', 'Distributors:', 2, 0);
    this.addComboBox('distributor_id', distributors, 2, 1, 3);

    this.addLabel('region_id', 'Regions:', 2, 4);
    this.addComboBox('region_id', regions, 2, 5);

    this.addLabel('season_number', 'Season:', 3, 0);
    this.addLineEdit('season_number', 3, 1);

    this.addLabel('episode_number', 'Episode:', 3, 2);
    this.addLineEdit('episode_number', 3, 3);

    this.addLabel('tmdb', 'TMDB ID:', 4, 0);
    this.addLineEdit('tmdb', 4, 1);

    this.addLabel('imdb', 'IMDB ID:', 4, 2);
    this.addLineEdit('imdb', 4, 3);

    this.addLabel('tvdb', 'TVDB ID:', 4, 4);
    this.addLineEdit('tvdb', 4, 5);

    this.addLabel('mal', 'MAL ID:', 4, 6);
    this.addLineEdit('mal', 4, 7);

    this.addLabel('keywords', 'Keywords:', 5, 0);
    this.addLineEdit('keywords', 5, 1, 7);

    this.addLabel('description', 'Description:', 6, 0);
    this.addTextEdit('description', 6, 1, 7);

    this.addLabel('mediainfo', 'MediaInfo:', 7, 0);
    this.addTextEdit('mediainfo', 7, 1, 7);

    this.addLabel('bdinfo', 'BDInfo:', 8, 0);
    this.addTextEdit('bdinfo', 8, 1, 7);

    this.addHorizontalGroup([
      this.addCheckBox('anonymous', 'Anonymous'),
      this.addCheckBox('stream', 'Stream optimized'),
      this.addCheckBox('sd', 'SD content'),
      this.addCheckBox('personal_release', 'Personal release'),
      this.addCheckBox('internal', 'Internal'),
      this.addComboBox('free', frees)
    ], 9, 0, 8);
  }

}