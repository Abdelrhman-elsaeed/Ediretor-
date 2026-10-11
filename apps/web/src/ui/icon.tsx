const paths = {
  plus:'M12 5v14M5 12h14', folder:'M3 7h7l2 2h9v11H3zM3 7V4h7l2 3',
  upload:'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6', film:'M3 3h18v18H3zM7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4',
  play:'m9 5 11 7-11 7z', pause:'M8 5v14M16 5v14', cut:'M9 9 21 3M9 15l12 6M9 9l6 3-6 3M3 3a4 4 0 1 0 6 6 4 4 0 0 0-6-6zm0 12a4 4 0 1 0 6 6 4 4 0 0 0-6-6z',
  undo:'M9 5 3 11l6 6M3 11h11a7 7 0 0 1 7 7', redo:'m15 5 6 6-6 6m6-6H10a7 7 0 0 0-7 7',
  sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
  moon:'M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12z', check:'m5 12 4 4L19 6', close:'m6 6 12 12M6 18 18 6',
  arrow:'m14 5-7 7 7 7', download:'M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4', search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
  sound:'M3 9h4l5-5v16l-5-5H3zM16 8a6 6 0 0 1 0 8', save:'M3 3h15l3 3v15H3zM7 3v6h10V3M7 21v-8h10v8',
  settings:'M3 6h18M3 12h18M3 18h18M8 3v6M16 9v6M10 15v6', info:'M12 11v6m0-10h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20', trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
};
export type IconName = keyof typeof paths;
export function Icon({name,size = 20}: {name:IconName;size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
