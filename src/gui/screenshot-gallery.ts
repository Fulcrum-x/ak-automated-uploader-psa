import { ContextMenuPolicy, ItemDataRole, ListViewMode, QAction, QIcon, QKeySequence, QListWidget, QListWidgetItem, QPixmap, QShortcut, QSize, QVariant, ResizeMode, SelectionMode, ShortcutContext } from "@nodegui/nodegui";
import { open } from "../util";

const THUMBNAIL_WIDTH = 160;
const THUMBNAIL_HEIGHT = 90;

export default class ScreenshotGallery {

  removeCallbacks: Array<(path: string) => void>;
  widget: QListWidget;

  constructor() {

    this.removeCallbacks = [];

    this.widget = new QListWidget();
    this.widget.setViewMode(ListViewMode.IconMode);
    this.widget.setResizeMode(ResizeMode.Adjust);
    this.widget.setIconSize(new QSize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT));
    this.widget.setSelectionMode(SelectionMode.ExtendedSelection);
    this.widget.viewport().setMinimumWidth((THUMBNAIL_WIDTH + 10) * 2);
    this.widget.setContextMenuPolicy(ContextMenuPolicy.ActionsContextMenu);

    this.buildOpenActions();
    this.buildRemovalActions();

  }

  add(path: string): void {

    const pixmap = new QPixmap();
    pixmap.load(path);

    const item = new QListWidgetItem();
    item.setIcon(new QIcon(pixmap));
    item.setData(ItemDataRole.UserRole, new QVariant(path));

    this.widget.addItem(item);

  }

  buildOpenActions(): void {

    const openSelected = () => {
      const selectedItems = this.widget.selectedItems();
      for (const selectedItem of selectedItems) {
        const path = selectedItem.data(ItemDataRole.UserRole).toString();
        open(path);
      }
    }

    ['Return', 'Enter'].forEach(key => {
      const openShortcutReturn = new QShortcut(this.widget);
      openShortcutReturn.setKey(new QKeySequence(key));
      openShortcutReturn.setContext(ShortcutContext.WidgetShortcut);
      openShortcutReturn.addEventListener('activated', openSelected);
    });

    const openAction = new QAction();
    openAction.setText('Open');
    openAction.addEventListener('triggered', openSelected);

    this.widget.addAction(openAction);

    this.widget.addEventListener('doubleClicked', openSelected);

  }

  buildRemovalActions(): void {

    const removeSelected = () => {
      const selectedItems = this.widget.selectedItems();
      for (const selectedItem of selectedItems) {
        const path = selectedItem.data(ItemDataRole.UserRole).toString();
        this.emitRemove(path);
      }
    };

    const removeShortcut = new QShortcut(this.widget);
    removeShortcut.setKey(new QKeySequence('Del'));
    removeShortcut.setContext(ShortcutContext.WidgetShortcut);
    removeShortcut.addEventListener('activated', removeSelected);

    const removeAction = new QAction();
    removeAction.setText('Remove');
    removeAction.addEventListener('triggered', removeSelected);

    this.widget.addAction(removeAction);

  }

  emitRemove(path: string): void {
    for (const callback of this.removeCallbacks) {
      callback(path);
    }
  }
  
  find(path: string): QListWidgetItem | undefined {
    for (const item of this.widget.items) {
      if (item instanceof QListWidgetItem) {
        if (item.data(ItemDataRole.UserRole).toString() === path) {
          return item;
        }
      }
    }
    return undefined;
  }

  onRemove(callback: (path: string) => void): void {
    this.removeCallbacks.push(callback);
  }

  remove(path): void {
    const item = this.find(path);
    if (!item) return;
    this.widget.takeItem(this.widget.row(item));
  }

}