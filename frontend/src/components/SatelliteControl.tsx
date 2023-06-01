import { Map } from 'mapbox-gl';
import { IControl, useControl } from 'react-map-gl';
import { cloneElement, useState } from 'react';
import { createPortal } from 'react-dom';

class OverlayControl implements IControl {
    _map: Map | null = null;
    _container: HTMLElement | null = null;
    _redraw: () => void;

    constructor(redraw: () => void) {
        this._redraw = redraw;
    }

    onAdd(map: Map) {
        this._map = map;
        map.on('move', this._redraw);
        this._container = document.createElement('div');
        this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
        this._redraw();
        return this._container;
    }

    onRemove() {
        this._container?.remove();
        this._map?.off('move', this._redraw);
        this._map = null;
    }

    getMap() {
        return this._map;
    }

    getElement() {
        return this._container;
    }
}
  
export default function CustomOverlay(props: { children: React.ReactElement }) {
    const [, setVersion] = useState(0);

    const ctrl = useControl<OverlayControl>(() => {
    const forceUpdate = () => setVersion(v => v + 1);
        return new OverlayControl(forceUpdate);
    });

    const map = ctrl.getMap();
    const el = ctrl.getElement();

    return map && el && createPortal(cloneElement(props.children, {map}), el);
}