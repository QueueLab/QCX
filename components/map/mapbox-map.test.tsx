import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Mapbox } from './mapbox-map';
import mapboxgl from 'mapbox-gl';

jest.mock('mapbox-gl', () => ({
  Map: jest.fn(() => ({
    on: jest.fn(),
    remove: jest.fn(),
    addControl: jest.fn(),
    addSource: jest.fn(),
    setTerrain: jest.fn(),
    addLayer: jest.fn(),
    flyTo: jest.fn(),
    once: jest.fn(),
  })),
  NavigationControl: jest.fn(),
}));

describe('Mapbox Component', () => {
  const position = { latitude: -3.0674, longitude: 37.3556 };

  it('renders without crashing', () => {
    render(<Mapbox position={position} />);
    expect(screen.getByText('Updating map position...')).toBeInTheDocument();
  });

  it('initializes map with correct position', () => {
    render(<Mapbox position={position} />);
    expect(mapboxgl.Map).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [position.longitude, position.latitude],
      })
    );
  });

  it('handles map rendering errors gracefully', () => {
    mapboxgl.Map.mockImplementationOnce(() => {
      throw new Error('Map rendering error');
    });
    expect(() => render(<Mapbox position={position} />)).toThrow('Map rendering error');
  });
});
