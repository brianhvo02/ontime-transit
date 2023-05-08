import { ROSM, ROSMProps, RContextType } from "rlayers";

export default class MyOSM extends ROSM {
    constructor(
      props: Readonly<ROSMProps>,
      context: React.Context<RContextType>
    ) {
        super(props, context);
    
        this.ol.on('postrender', (evt) => {
            if (evt.context) {
                const ctx = evt.context as CanvasRenderingContext2D;
                ctx.globalCompositeOperation = 'color';
                ctx.fillStyle = 'rgba(0, 0, 0,' + 1.0 + ')';
                ctx.fillRect(0, 0, evt.context.canvas.width, evt.context.canvas.height);
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = 'rgb(' + [200, 200, 200].toString() + ')';
                ctx.fillRect(0, 0, evt.context.canvas.width, evt.context.canvas.height);
                ctx.globalCompositeOperation = 'source-over';
                ctx.canvas.style.filter = "invert(99%)";
            }
        });
    
        this.eventSources = [this.ol];
        this.attachEventHandlers();
    }
}