//NOTE: possibly use tsparticles...
const VERT_RADIUS = 5;
const VERT_GLOW_RADIUS = 10;
const VERT_BASE_COLOR = '#289120';

const LINE_WIDTH = 2;
const LINE_GLOW_RADIUS = 2;
const LINE_COLOR = '#51d448';

/**
 * @type {HTMLCanvasElement}
 */
const canvas = document.getElementById("bg-anim");

/**
 * @type {CanvasRenderingContext2D}
 */
const ctx = canvas.getContext("2d");

canvas.clientWidth = document.body.clientWidth + "px";
canvas.clientHeight = document.body.clientHeight + "px";
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

class Vertex
{
    constructor(x, y, z=0)
    {
        this.baseCoords = {
            x: x,
            y: y,
            z: z
        };
    }

    drawSelf()
    {
        ctx.shadowBlur = VERT_GLOW_RADIUS;
        ctx.shadowColor = VERT_BASE_COLOR;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.fillStyle = VERT_BASE_COLOR;
        ctx.beginPath();
        ctx.arc(this.baseCoords.x, this.baseCoords.y, VERT_RADIUS, 0, Math.PI*2);
        ctx.fill();
    }
}

class Triangle
{
    constructor(vert1, vert2, vert3)
    {
        /**
         * @type {Vertex[]}
         */
        this.verts = [vert1, vert2, vert3];
    }

    drawSelf()
    {
        ctx.shadowBlur = LINE_GLOW_RADIUS;
        ctx.shadowColor = LINE_COLOR;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.beginPath();
        ctx.strokeStyle = LINE_COLOR;
        ctx.lineWidth= LINE_WIDTH;
        ctx.moveTo(this.verts[0].baseCoords.x, this.verts[0].baseCoords.y)
        ctx.lineTo(this.verts[1].baseCoords.x, this.verts[1].baseCoords.y)
        ctx.lineTo(this.verts[2].baseCoords.x, this.verts[2].baseCoords.y)
        ctx.lineTo(this.verts[0].baseCoords.x, this.verts[0].baseCoords.y)
        ctx.stroke();

    }
}

function updateState(deltaTime)
{

}

function renderFrame()
{
    ctx.clearRect(0,0, canvas.width, canvas.height);

    tris.forEach((triangle) => {
        triangle.drawSelf();
    })

    vertices.forEach((vertex) => {
        vertex.drawSelf();
    });
}

function main(timestamp, lastTimestamp=null)
{
    let deltaTime = 0
    if(lastTimestamp !== null)
    {
        deltaTime = timestamp - lastTimestamp
    }

    updateState(deltaTime)
    renderFrame();

    window.requestAnimationFrame((nextTimestamp) => {
        main(nextTimestamp, timestamp)});
}


let vertices = [new Vertex(20, 20), new Vertex(50, 120), new Vertex(80, 60)];
let tris = [new Triangle(vertices[0], vertices[1], vertices[2])]

main(document.timeline.currentTime);