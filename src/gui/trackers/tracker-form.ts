import { Direction, QBoxLayout, QCheckBox, QComboBox, QGridLayout, QLabel, QLineEdit, QPlainTextEdit, QSizePolicyPolicy, QVariant, QWidget } from "@nodegui/nodegui";

export default class TrackerForm {

  widgets: Array<{
    name: string;
    widget: QWidget;
    type: new() => QWidget;
  }>;
  widget: QWidget;
  layout: QGridLayout;
  valueChangedCallbacks: Array<(name: string, value: string | boolean) => void>;

  constructor() {

    this.widgets = [];

    this.widget = new QWidget();

    this.layout = new QGridLayout();
    this.layout.setContentsMargins(0, 0, 0, 0);
    this.widget.setLayout(this.layout);

    this.valueChangedCallbacks = [];

  }

  addCheckBox(name: string, label: string, row?: number, column?: number, columnSpan?: number): QCheckBox {

    const widget = new QCheckBox();
    widget.setText(label);
    this.widgets.push({ name, widget, type: QCheckBox });

    widget.addEventListener('toggled', checked => this.emitValueChanged(name, checked));

    if (!Number.isNaN(row) && !Number.isNaN(column)) {
      this.layout.addWidget(widget, row, column, undefined, columnSpan);
    }

    return widget;

  }

  addComboBox(name: string, options: [string, string][], row?: number, column?: number, columnSpan?: number): QComboBox {

    const widget = new QComboBox();
    for (const option of options) {
      const [key, value] = option;
      widget.addItem(undefined, value, new QVariant(key));
    }
    this.widgets.push({ name, widget, type: QComboBox });

    widget.addEventListener('currentTextChanged', text => this.emitValueChanged(name, text));

    if (!Number.isNaN(row) && !Number.isNaN(column)) {
      this.layout.addWidget(widget, row, column, undefined, columnSpan);
    }

    return widget;

  }

  addHorizontalGroup(widgets: QWidget[], row?: number, column?: number, columnSpan?: number): void {

    const layout = new QBoxLayout(Direction.LeftToRight);
    layout.setContentsMargins(0, 0, 0, 0);

    const widget = new QWidget();
    widget.setLayout(layout);

    for (const widget of widgets) {
      widget.setSizePolicy(QSizePolicyPolicy.Minimum, QSizePolicyPolicy.Minimum);
      layout.addWidget(widget);
    }

    widgets[widgets.length - 1].setSizePolicy(QSizePolicyPolicy.Expanding, QSizePolicyPolicy.Minimum);

    if (!Number.isNaN(row) && !Number.isNaN(column)) {
      this.layout.addWidget(widget, row, column, undefined, columnSpan);
    }

  }

  addLabel(name: string, label: string, row?: number, column?: number, columnSpan?: number): QLabel {

    const widget = new QLabel();
    widget.setText(label);
    this.widgets.push({ name, widget, type: QLabel });

    if (!Number.isNaN(row) && !Number.isNaN(column)) {
      this.layout.addWidget(widget, row, column, undefined, columnSpan);
    }

    return widget;

  }
  
  addLineEdit(name: string, row?: number, column?: number, columnSpan?: number): QLineEdit {

    const widget = new QLineEdit();
    this.widgets.push({ name, widget, type: QLineEdit });

    widget.addEventListener('textChanged', text => this.emitValueChanged(name, text));

    if (!Number.isNaN(row) && !Number.isNaN(column)) {
      this.layout.addWidget(widget, row, column, undefined, columnSpan);
    }

    return widget;

  }

  addTextEdit(name: string, row?: number, column?: number, columnSpan?: number): QPlainTextEdit {

    const widget = new QPlainTextEdit();
    widget.setInlineStyle("font: 9pt 'Consolas', 'DejaVu Sans Mono', 'Andale Mono', monospace");
    this.widgets.push({ name, widget, type: QPlainTextEdit });

    widget.addEventListener('textChanged', () => this.emitValueChanged(name, widget.toPlainText()));

    if (!Number.isNaN(row) && !Number.isNaN(column)) {
      this.layout.addWidget(widget, row, column, undefined, columnSpan);
    }

    return widget;

  }

  emitValueChanged(name: string, value: string | boolean): void {
    for (const callback of this.valueChangedCallbacks) {
      callback(name, value);
    }
  }

  /**
   * Get a label added with addLabel. There is a distinction between getLabel
   * and just using getWidget so that you can add a label and widget with the
   * same name.
   * 
   * @param name Name to search for
   * @returns The corresponding label, or throws an error on failure
   */

  getLabel(name: string): QLabel {

    const label = this.widgets.find(value => value.name === name && value.widget instanceof QLabel);
    if (!label || false === label.widget instanceof QLabel) {
      throw Error(`Couldn't find label ${name}`);
    }
    return label.widget;

  }

  /**
   * Get a widget added with one of the various widget functions (addTextEdit,
   * addComboBox, etc). There is a distinction between getLabel and getWidget
   * so you can add a label and widget with the same name.
   * 
   * @param name Name to search for
   * @returns The corresponding widget, or throws an error on failure
   */

  getWidget(name: string): QWidget {

    const widget = this.widgets.find(value => value.name === name && false === value.widget instanceof QLabel);
    if (!widget) {
      throw Error(`Couldn't find form field ${name}`);
    }
    return widget.widget;

  }

  getValue(name: string): string | boolean {

    const widget = this.getWidget(name);

    if (widget instanceof QLineEdit) {
      return widget.text();
    } else if (widget instanceof QPlainTextEdit) {
      return widget.toPlainText();
    } else if (widget instanceof QComboBox) {
      const index = widget.currentIndex();
      const variant = widget.itemData(index);
      return variant.toString();
    } else if (widget instanceof QCheckBox) {
      return widget.isChecked();
    } else {
      throw Error(`Couldn't get form field value for ${name}, unexpected form field type`);
    }

  }

  getValues(): Record<string, string | boolean> {

    const widgets = this.widgets.filter(value => false === value.widget instanceof QLabel);

    const output: Record<string, string | boolean> = {};

    for (const widget of widgets) {
      output[widget.name] = this.getValue(widget.name);
    }

    return output;

  }

  onValueChanged(callback: (name: string, value: string | boolean) => void): void {
    this.valueChangedCallbacks.push(callback);
  }

  setValue(name: string, value: string | boolean, skipCallback?: boolean): void {

    const widget = this.getWidget(name);

    if (widget instanceof QLineEdit) {
      widget.setText(String(value));
    } else if (widget instanceof QPlainTextEdit) {
      widget.setPlainText(String(value));
    } else if (widget instanceof QComboBox) {
      for (let i = 0; i < widget.count(); i++) {
        if (widget.itemData(i).toString() === String(value)) {
          widget.setCurrentIndex(i);
        }
      }
      widget.setCurrentText(String(value));
    } else if (widget instanceof QCheckBox) {
      widget.setChecked(Boolean(value));
    } else {
      throw Error(`Coudln't set form field value for ${name}, unexpected form field type`);
    }

  }

  setValues(values: Record<string, string | boolean>, skipCallback?: boolean): void {
    for (const key in values) {
      this.setValue(key, values[key]);
    }
  }

}