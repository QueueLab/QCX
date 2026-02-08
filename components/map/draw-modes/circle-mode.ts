import * as turf from '@turf/turf';

const CircleMode: any = {
  onSetup: function(opts: any) {
    const state: any = {};
    state.circle = this.newFeature({
      type: 'Feature',
      properties: {
        user_isCircle: true,
        user_center: []
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[]]
      }
    });
    this.addFeature(state.circle);
    this.clearSelectedFeatures();
    this.updateUIClasses({ mouse: 'add' });
    this.activateUIButton('circle');
    this.setActionableState({
      trash: true
    });
    return state;
  },

  onTap: function(state: any, e: any) {
    this.onClick(state, e);
  },

  onClick: function(state: any, e: any) {
    if (state.circle.properties.user_center.length === 0) {
      state.circle.properties.user_center = [e.lngLat.lng, e.lngLat.lat];
      // Set initial point-like polygon
      state.circle.setCoordinates([[
        [e.lngLat.lng, e.lngLat.lat],
        [e.lngLat.lng, e.lngLat.lat],
        [e.lngLat.lng, e.lngLat.lat],
        [e.lngLat.lng, e.lngLat.lat]
      ]]);
    } else {
      this.changeMode('simple_select', { featureIds: [state.circle.id] });
    }
  },

  onMouseMove: function(state: any, e: any) {
    if (state.circle.properties.user_center.length > 0) {
      const center = state.circle.properties.user_center;
      const distance = turf.distance(center, [e.lngLat.lng, e.lngLat.lat], { units: 'kilometers' });
      const circle = turf.circle(center, distance, { steps: 64, units: 'kilometers' });
      state.circle.setCoordinates(circle.geometry.coordinates);
      state.circle.properties.user_radiusInKm = distance;
    }
  },

  onKeyUp: function(state: any, e: any) {
    if (e.keyCode === 27) return this.changeMode('simple_select');
  },

  toDisplayFeatures: function(state: any, geojson: any, display: any) {
    const isActive = geojson.id === state.circle.id;
    geojson.properties.active = isActive ? 'true' : 'false';
    if (!isActive) return display(geojson);

    // Only display if it has a center (and thus coordinates set)
    if (geojson.properties.user_center && geojson.properties.user_center.length > 0) {
      display(geojson);
    }
  }
};

export default CircleMode;
