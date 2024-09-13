import { categories } from '../../models/trackers/hd-torrents';
import TrackerForm from './tracker-form';

export default class HDTorrentsForm extends TrackerForm {

  constructor() {

    super();

    this.addLabel('category', 'Category:', 0, 0);
    this.addComboBox('category', categories, 0, 1);

    this.addLabel('filename', 'File name:', 1, 0);
    this.addLineEdit('filename', 1, 1);

    this.addLabel('infosite', 'IMDB link:', 2, 0);
    this.addLineEdit('infosite', 2, 1);

    this.addLabel('infodiscogssite', 'Discogs link:', 3, 0);
    this.addLineEdit('infodiscogssite', 3, 1);

    this.addLabel('info', 'Technical info:', 4, 0);
    this.addTextEdit('info', 4, 1);

    this.addCheckBox('3d', '3D', 5, 0, 2);

    this.addHorizontalGroup([
      this.addCheckBox('HDR10', 'HDR10'),
      this.addCheckBox('HDR10Plus', 'HDR10+'),
      this.addCheckBox('DolbyAtmos', 'Dolby Atmos'),
      this.addCheckBox('DolbyVision', 'Dolby Vision'),
    ], 6, 0, 2);

    this.addCheckBox('season', 'Full season', 7, 0, 2);
    this.addCheckBox('requested', 'Requested', 8, 0, 2);
    this.addCheckBox('nuked', 'Nuked', 9, 0);
    this.addLineEdit('nuked_reason', 9, 1);
    this.addCheckBox('anonymous', 'Anonymous', 10, 0, 2);

  }

}