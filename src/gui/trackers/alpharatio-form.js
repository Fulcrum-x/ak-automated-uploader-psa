import { types } from '../../models/trackers/alpharatio';
import TrackerForm from './tracker-form';

export default class AlphaRatioForm extends TrackerForm {

  constructor() {

    super();

    this.addLabel('type', 'Type:', 0, 0);
    this.addComboBox('type', types, 0, 1);

    this.addLabel('title', 'Title:', 1, 0);
    this.addLineEdit('title', 1, 1);

    this.addLabel('tags', 'Tags:', 2, 0);
    this.addLineEdit('tags', 2, 1);

    this.addLabel('image', 'Image:', 3, 0);
    this.addLineEdit('image', 3, 1);

    this.addLabel('desc', 'Description:', 4, 0);
    this.addTextEdit('desc', 4, 1);

    this.addCheckBox('scene', 'Scene', 5, 0, 2);
    this.addCheckBox('autoqueue', 'Auto queue', 6, 0, 2);

  }

}