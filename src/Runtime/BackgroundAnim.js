const VERT_RADIUS = 5;
const VERT_GLOW_RADIUS = 10;
const VERT_BASE_COLOR = '#289120';

const LINE_WIDTH = 2;
const LINE_GLOW_RADIUS = 2;
const LINE_COLOR = '#51d448';

const NOISE_GRID_SIZE = 400;
const NOISE_TIME_SCALE = 8000;

const FLUID_FORCE_STRENGTH = .2;
const SPRING_FORCE_STRENGTH = .08;
const SPRING_FACTOR = .2;
const DAMPING = 0.97;

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
        let distance = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
        let springForce = SPRING_FORCE_STRENGTH + SPRING_FACTOR * distance/100;
        let springForceVector = new Vector(springDirection, springForce);

        let totalForceVector = Vector.sumVectors(flowForceVector, springForceVector);

        this.velocityVector = Vector.sumVectors(this.velocityVector, totalForceVector);

        this.velocityVector.strength *= DAMPING;
    }

    updatePosition(deltaTime)
    {
        this.currentCoords.x += this.velocityVector.getComponentX()*deltaTime/1000;
        this.currentCoords.y += this.velocityVector.getComponentY()*deltaTime/1000;
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
     * 
     * @param  {...Vector} vectors 
     */
    static sumVectors(...vectors)
    {
        let totalX = 0;
        let totalY = 0;

        vectors.forEach(vector =>
        {
            totalX += vector.getComponentX();
            totalY += vector.getComponentY();
        })

        return Vector.fromComponents(totalX, totalY);
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

    /**
     * 
     * @param  {Vector} vector1
     * @param  {Vector} vector2
     */
    static dotProduct(vector1, vector2)
    {
        let angleDiff = Math.abs(vector1.angle - vector2.angle)
        angleDiff = Math.min(angleDiff, 360-angleDiff)
        return vector1.strength * vector2.strength * Math.cos(Vector.radians(angleDiff))
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

    getEndTime()
    {
        return this.lattice[0][0][1].time
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

                    let dotProduct = Vector.dotProduct(distanceVector, corner.vector);

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

function smooth(t)
{
    return 6*Math.pow(t, 5) - 15*Math.pow(t, 4) + 10*Math.pow(t, 3);
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

perlin = new PerlinNoise();

main(document.timeline.currentTime);