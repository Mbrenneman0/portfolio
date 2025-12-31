//NOTE: possibly use tsparticles...

const VERT_RADIUS = 5;
const VERT_GLOW_RADIUS = 10;
const VERT_BASE_COLOR = '#289120';

const LINE_WIDTH = 2;
const LINE_GLOW_RADIUS = 2;
const LINE_COLOR = '#51d448';

const NOISE_GRID_SIZE = 400;
const NOISE_TIME_SCALE = 2000;

const directions = 
{
    north: 270,
    east: 0,
    south: 90,
    west: 180
}

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

class Vector
{
    /**
     * 
     * @param {*} dir - direction in degrees
     * @param {*} strength - length of the vector
     */
    constructor(dir, strength)
    {
        this.angle = Vector.#normalizeAngle(dir);
        this.strength = strength;
    }

    static fromComponents(x, y)
    {
        let angle = Vector.degrees(Math.atan2(y,x))
        let strength = Math.hypot(x,y);
        return new Vector(angle, strength);
    }

    /**
     * Ensures any input is normalized to a value between 0 and 359
     * @param {Number} inputAngle - any number
     * @returns {Number} Normalized angle value
     */
    static #normalizeAngle(inputAngle)
    {
        let angle = inputAngle % 360;
        if(angle < 0)
        {
            angle += 360;
        }

        return angle;
    }

    static translateAngle(angle1, angle2)
    {
        let newAngle = angle1+angle2;
        newAngle = this.#normalizeAngle(newAngle);
        return newAngle;
    }

    #mirrorAngleX(angle)
    {
        return Vector.#normalizeAngle(360-angle)
    }

    #mirrorAngleY(angle)
    {
        return Vector.#normalizeAngle(180-angle);
    }

    static radians(degrees)
    {
        return degrees * (Math.PI/180)
    }

    static degrees(radians)
    {
        return radians / (Math.PI/180)
    }


    getComponentX()
    {
        return this.strength * Math.cos(Vector.radians(this.angle))
    }

    getComponentY()
    {
        return -this.strength * Math.sin(Vector.radians(this.angle))
    }
}

class PerlinNoise
{
    static LatticePoint = class
    {
        constructor(x, y, time, vector)
        {
            this.x = x
            this.y = y
            this.time = time
            this.vector = vector
        }
    }

    constructor()
    {
        this.lattice = this.createLattice()
    }

    createLattice()
    {
        let lattice = [];

        const cols = Math.ceil(canvas.width / NOISE_GRID_SIZE) + 1;
        const rows = Math.ceil(canvas.height / NOISE_GRID_SIZE) + 1;

        for(let x = 0; x < cols; x++)
        {
            lattice[x] = [];
            for(let y = 0; y < rows; y++)
            {
                lattice[x][y] = [];
                for(let time = 0; time <= 1; time++)
                {
                    lattice[x][y][time] = new PerlinNoise.LatticePoint(
                        x       * NOISE_GRID_SIZE,
                        y       * NOISE_GRID_SIZE,
                        time    * NOISE_TIME_SCALE,
                        new Vector(Math.floor(Math.random()*360), 1)
                    )
                }
            }
        }

    return lattice;
    }

    newTimeLayer()
    {
        this.lattice.forEach(col =>
            {
                col.forEach(colRow =>
                {
                    let temp = colRow[1]
                    colRow[0] = temp;
                    colRow[1] = new PerlinNoise.LatticePoint(
                        temp.x,
                        temp.y,
                        temp.time + NOISE_TIME_SCALE,
                        new Vector(Math.floor(Math.random()*360), 1)
                    )
                })
            })
    }

    sample(x, y, time)
    {
        let indexX = Math.floor(x/NOISE_GRID_SIZE);
        let indexY = Math.floor(y/NOISE_GRID_SIZE);
        let indexT = 0;
        let weightedScalar = []
        for (let iX = indexX; iX <= indexX + 1; iX++)
        {
            for (let iY = indexY; iY <= indexY+1; iY++)
            {
                for(let iT = indexT; iT <= indexT + 1; iT++)
                {
                    let corner = this.lattice[iX][iY][iT];

                    let dx = x - corner.x;
                    let dy = y - corner.y;
                    let dt = time - corner.time;

                    let distanceVector = Vector.fromComponents(dx, dy);

                    let dotProduct = dotProduct(distanceVector, corner.vector);

                    let fractionalDX = dx/NOISE_GRID_SIZE;
                    let fractionalDY = dy/NOISE_GRID_SIZE;
                    let fractionalDT = dt/NOISE_TIME_SCALE;

                    let smoothX = smooth(fractionalDX);
                    let smoothY = smooth(fractionalDY);
                    let smoothT = smooth(fractionalDT);

                    let weight = (smoothX+smoothY+smoothT)/3

                    weightedScalar.push(dotProduct*weight);
                }
            }
        }

        let weightSum = weightedScalar.reduce((a,b) => a + Math.abs(b), 0);
        let finalScalar = weightedScalar.reduce((a,b) => a + b, 0) / weightSum;
        
        return finalScalar;

    }
}

/**
 * 
 * @param  {Vector} vector1
 * @param  {Vector} vector2
 */
function dotProduct(vector1, vector2)
{
    let angleDiff = Math.abs(vector1.angle - vector2.angle)
    angleDiff = Math.min(angleDiff, 360-angleDiff)
    return vector1.strength * vector2.strength * Math.cos(Vector.radians(angleDiff))
}

function smooth(t)
{
    return 6*Math.pow(t, 5) - 15*Math.pow(t, 4) + 10*Math.pow(t, 3);
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


let vertices = [new Vertex(20, 20), new Vertex(50, 120), new Vertex(80, 60), new Vertex(180, 90)];
let tris = [new Triangle(vertices[0], vertices[1], vertices[2]), new Triangle(vertices[1], vertices[2], vertices[3])]

main(document.timeline.currentTime);