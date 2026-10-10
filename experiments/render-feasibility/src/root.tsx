import React from 'react';
import {Composition} from 'remotion';
import fixtures from '../generated/snapshots.json';
import {parseSnapshot, compile} from './contract';
import {FeasibilityComposition} from './composition';
export const Root = () => <>{fixtures.map(value=>{
  const snapshot = parseSnapshot(value);
  return <Composition key={snapshot.fixture} id={snapshot.fixture} component={FeasibilityComposition} defaultProps={{snapshot}} width={snapshot.width} height={snapshot.height} fps={snapshot.fps.num/snapshot.fps.den} durationInFrames={compile(snapshot).durationInFrames}/>;
})}</>;
