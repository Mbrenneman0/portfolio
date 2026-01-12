import {Utils} from "./modules/utils.js";
import {Vector} from "./modules/vector.js";
import {PerlinNoise} from "./modules/perlinnoise.js";

const VERT_RADIUS = 5;
const VERT_GLOW_RADIUS = 10;
const VERT_BASE_COLOR = '#289120';

const LINE_WIDTH = 2;
const LINE_GLOW_RADIUS = 2;
const LINE_COLOR = '#51d448';

const MAX_VELOCITY = 8;

const NOISE_GRID_SIZE = 400;
const NOISE_TIME_SCALE = 6000;

const FLUID_FORCE_STRENGTH = .3;

const SPRING_MAX_FORCE = 1.5;
const SPRING_MIN_DISTANCE = 20;
const SPRING_MAX_DISTANCE = 100;

const DAMPING = 0.97;

const MOUSE_STRENGTH = 6;
const MOUSE_EFFECT_DISTANCE = 100;

const directions = 
{
    north: 270,
    east: 0,
    south: 90,
    west: 180
};

/**
 * @type {HTMLCanvasElement}
 */
const canvas = document.getElementById("bg-anim");

/**
 * @type {CanvasRenderingContext2D}
 */
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("mousemove", event => {mouseOver(event)});

class Vertex
{
    constructor(x, y, z=0)
    {
        this.baseCoords = {
            x: x,
            y: y,
            z: z
        };

        this.currentCoords = {
            x: this.baseCoords.x,
            y: this.baseCoords.y,
            z: this.baseCoords.z,
        }

        this.mouseForceVector = new Vector(0, 0);

        this.velocityVector = new Vector(0, 0);
    }

    drawSelf()
    {
        ctx.shadowBlur = VERT_GLOW_RADIUS;
        ctx.shadowColor = VERT_BASE_COLOR;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.fillStyle = VERT_BASE_COLOR;
        ctx.beginPath();
        ctx.arc(this.currentCoords.x, this.currentCoords.y, VERT_RADIUS, 0, Math.PI*2);
        ctx.fill();
    }

    updateForce(timestamp)
    {
        let noiseSample = perlin.sample(this.baseCoords.x, this.baseCoords.y, timestamp);
        let flowForceDirection = (noiseSample * 180) + 180
        let flowForceVector = new Vector(flowForceDirection, FLUID_FORCE_STRENGTH);

        let deltaX = this.baseCoords.x - this.currentCoords.x;
        let deltaY = this.baseCoords.y - this.currentCoords.y;

        let springDirection = Vector.degrees(Math.atan2(deltaY, deltaX));
        let distance = Math.hypot(deltaX, deltaY);
        let springForceSlope = (distance - SPRING_MIN_DISTANCE)/(SPRING_MAX_DISTANCE - SPRING_MIN_DISTANCE);
        springForceSlope = Math.max(0, Math.min(1, springForceSlope));
        let springForceStrength = Utils.smooth(springForceSlope) * SPRING_MAX_FORCE;

        let springForceVector = new Vector(springDirection, springForceStrength);

        let totalForceVector = Vector.sumVectors(flowForceVector, springForceVector);

        this.velocityVector = Vector.sumVectors(this.velocityVector, totalForceVector);

        if(this.mouseForceVector.strength > 0)
        {
            this.velocityVector = Vector.sumVectors(this.velocityVector, this.mouseForceVector)
        }

        this.velocityVector.strength *= DAMPING;

        if(distance > SPRING_MAX_DISTANCE)
        {
            let outwardVector = Vector.fromComponents(-deltaX, -deltaY);
            outwardVector.strength = 1;

            let outwardSpeed = Vector.dotProduct(this.velocityVector, outwardVector);

            if(outwardSpeed > 0)
            {
                this.velocityVector = Vector.sumVectors(this.velocityVector,
                                new Vector(outwardVector.angle + 180, outwardSpeed));
            }
        }

        if(this.velocityVector.strength > MAX_VELOCITY)
        {
            this.velocityVector.strength = MAX_VELOCITY;
        }
    }

    updatePosition(deltaTime)
    {
        this.currentCoords.x += this.velocityVector.getComponentX()*deltaTime/1000;
        this.currentCoords.y += this.velocityVector.getComponentY()*deltaTime/1000;

        let deltaX = this.currentCoords.x - this.baseCoords.x;
        let deltaY = this.currentCoords.y - this.baseCoords.y;

        let distanceVector = Vector.fromComponents(deltaX, deltaY);

        if(distanceVector.strength > SPRING_MAX_DISTANCE)
        {
            distanceVector.strength = SPRING_MAX_DISTANCE;
            this.currentCoords.x = this.baseCoords.x + distanceVector.getComponentX();

            //math-space y is up and screenspace y is down. invert this after fixing:
            this.currentCoords.y = this.baseCoords.y + distanceVector.getComponentY();
        }
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
        ctx.moveTo(this.verts[0].currentCoords.x, this.verts[0].currentCoords.y)
        ctx.lineTo(this.verts[1].currentCoords.x, this.verts[1].currentCoords.y)
        ctx.lineTo(this.verts[2].currentCoords.x, this.verts[2].currentCoords.y)
        ctx.lineTo(this.verts[0].currentCoords.x, this.verts[0].currentCoords.y)
        ctx.stroke();

    }
}

/**
 * 
 * @param {MouseEvent} event 
 */
function mouseOver(event)
{
    let mouseX = event.clientX;
    let mouseY = event.clientY;

    vertices.forEach(vertex =>
    {
        let vertexX = vertex.currentCoords.x;
        let vertexY = vertex.currentCoords.y;

        let distance = Utils.getDistance(mouseX, mouseY, vertexX, vertexY)
        if(distance < MOUSE_EFFECT_DISTANCE)
        {
            let slope = -(MOUSE_STRENGTH/MOUSE_EFFECT_DISTANCE)*distance + MOUSE_STRENGTH;

            let angle = Vector.degrees(Math.atan2(vertexY - mouseY, vertexX - mouseX));

            vertex.mouseForceVector = new Vector(angle, slope);
        }
        else{
            vertex.mouseForceVector.strength = 0;
        }
    })
}

function updateState(timestamp, deltaTime)
{
    while(timestamp > perlin.getEndTime())
    {
        perlin.newTimeLayer();
    }

    vertices.forEach(vertex =>
    {
        vertex.updateForce(timestamp);
        vertex.updatePosition(deltaTime);
    })
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

    updateState(timestamp, deltaTime)
    renderFrame();

    window.requestAnimationFrame((nextTimestamp) => {
        main(nextTimestamp, timestamp)});
}


let vertices = 
    [
        new Vertex(20, 20),
        new Vertex(50, 120),
        new Vertex(80, 60),
        new Vertex(180, 90),
        new Vertex(155, 300),
        new Vertex(245, 280),
        new Vertex(350, 370),
        new Vertex(330, 235),
        new Vertex(255, 440)
    ];
let tris = 
    [
        new Triangle(vertices[0], vertices[1], vertices[2]),
        new Triangle(vertices[1], vertices[2], vertices[3]),
        new Triangle(vertices[4], vertices[5], vertices[6]),
        new Triangle(vertices[5], vertices[6], vertices[7]),
        new Triangle(vertices[5], vertices[6], vertices[8]),
        new Triangle(vertices[4], vertices[6], vertices[8])
    ]

const perlin = new PerlinNoise(canvas.width, canvas.height, NOISE_GRID_SIZE, NOISE_TIME_SCALE);

main(document.timeline.currentTime);