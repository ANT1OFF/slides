// A picture of this deck's own for <Backdrop shader>: the route as a line of light with a glow at
// each stop (V.x of them) and one bus that runs it, pausing at every stop. GLSL statements that
// colour `c`; docs/motion.md, "A picture of your own", lists what they can read.
export const routeLight = `
float w=R.x/R.y,n=V.x-1.,y=s.y-.22;
float u=(s.x/w+.5-.0625)/.875;                       // 0 to 1 along the route, inside the slide's side padding
float on=step(0.,u)*step(u,1.);
float k=clamp(floor(u*n+.5),0.,n);                    // the nearest stop
vec2 p=vec2((u-k/n)*.875*w,y);
float m=mod(U.x*.4,n+1.5);                            // the bus: a stop every 2.5 s, then a pause at the end
float b=min(1.,(floor(m)+smoothstep(0.,.6,fract(m)))/n);
vec2 q=vec2((u-b)*.875*w,y);
float lit=step(k/n,b+.001);                           // stops the bus has passed stay lit
c=mix(c,C[1],a*.35*on*exp(-y*y*60000.));              // the line
c=mix(c,mix(C[1],C[2],lit),a*(.9*exp(-dot(p,p)*9000.)+.12*lit*exp(-dot(p,p)*260.)));
c=mix(c,C[2],a*(exp(-dot(q,q)*5000.)+.4*exp(-dot(q,q)*70.)));
`;
