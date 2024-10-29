import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Mapbox } from '../components/map/mapbox-map';

describe('Mapbox Component', () => {
  const position = { latitude: 37.7749, longitude: -122.4194 };

  test('renders Mapbox component', () => {
    render(<Mapbox position={position} />);
    const mapElement = screen.getByRole('map');
    expect(mapElement).toBeInTheDocument();
  });

  test('includes point, line, and rectangle drawing tools', () => {
    render(<Mapbox position={position} />);
    const pointTool = screen.getByLabelText('Draw Point');
    const lineTool = screen.getByLabelText('Draw Line');
    const rectangleTool = screen.getByLabelText('Draw Rectangle');
    expect(pointTool).toBeInTheDocument();
    expect(lineTool).toBeInTheDocument();
    expect(rectangleTool).toBeInTheDocument();
  });

  test('includes visualization tools from Turf', () => {
    render(<Mapbox position={position} />);
    const bufferTool = screen.getByLabelText('Buffer');
    const centroidTool = screen.getByLabelText('Centroid');
    const convexTool = screen.getByLabelText('Convex');
    expect(bufferTool).toBeInTheDocument();
    expect(centroidTool).toBeInTheDocument();
    expect(convexTool).toBeInTheDocument();
  });

  test('Mapbox is always available to preview', () => {
    render(<Mapbox position={position} />);
    const mapElement = screen.getByRole('map');
    expect(mapElement).toBeInTheDocument();
  });

  test('keyboard shortcuts for drawing tools and visualization tools', () => {
    render(<Mapbox position={position} />);
    fireEvent.keyDown(document, { key: '1', ctrlKey: true });
    const pointTool = screen.getByLabelText('Draw Point');
    expect(pointTool).toHaveClass('active');

    fireEvent.keyDown(document, { key: '2', ctrlKey: true });
    const lineTool = screen.getByLabelText('Draw Line');
    expect(lineTool).toHaveClass('active');

    fireEvent.keyDown(document, { key: '3', ctrlKey: true });
    const polygonTool = screen.getByLabelText('Draw Polygon');
    expect(polygonTool).toHaveClass('active');

    fireEvent.keyDown(document, { key: '4', ctrlKey: true });
    const trashTool = screen.getByLabelText('Trash');
    expect(trashTool).toHaveClass('active');

    fireEvent.keyDown(document, { key: '5', ctrlKey: true });
    const bufferTool = screen.getByLabelText('Buffer');
    expect(bufferTool).toHaveClass('active');

    fireEvent.keyDown(document, { key: '6', ctrlKey: true });
    const centroidTool = screen.getByLabelText('Centroid');
    expect(centroidTool).toHaveClass('active');

    fireEvent.keyDown(document, { key: '7', ctrlKey: true });
    const convexTool = screen.getByLabelText('Convex');
    expect(convexTool).toHaveClass('active');
  });
});
