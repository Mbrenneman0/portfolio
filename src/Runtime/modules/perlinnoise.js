import {Utils} from "./utils.js";
import {Vector} from "./vector.js";

export class PerlinNoise
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

    constructor(canvasWidth, canvasHeight, gridSize, timeScale)
    {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.gridSize = gridSize;
        this.timeScale = timeScale;
        this.lattice = this.createLattice()
    }

    createLattice()
    {
        let lattice = [];

        const cols = Math.ceil(this.canvasWidth / this.gridSize) + 1;
        const rows = Math.ceil(this.canvasHeight / this.gridSize) + 1;

        for(let x = 0; x < cols; x++)
        {
            lattice[x] = [];
            for(let y = 0; y < rows; y++)
            {
                lattice[x][y] = [];
                for(let time = 0; time <= 1; time++)
                {
                    lattice[x][y][time] = new PerlinNoise.LatticePoint(
                        x       * this.gridSize,
                        y       * this.gridSize,
                        time    * this.timeScale,
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
                        temp.time + this.timeScale,
                        new Vector(Math.floor(Math.random()*360), 1)
                    )
                })
            })
    }

    sample(x, y, time)
    {
        let indexX = Math.floor(x/this.gridSize);
        let indexY = Math.floor(y/this.gridSize);
        let indexT = 0;
        let weightedScalar = [];

        for (let iX = indexX; iX <= indexX + 1; iX++)
        {
            for (let iY = indexY; iY <= indexY+1; iY++)
            {
                for(let iT = indexT; iT <= indexT + 1; iT++)
                {
                    let corner = this.lattice[iX][iY][iT];

                    let dx = Math.abs(x - corner.x);
                    let dy = Math.abs(y - corner.y);
                    let dt = Math.abs(time - corner.time);

                    let distanceVector = Vector.fromComponents(dx, dy);

                    let dotProduct = Vector.dotProduct(distanceVector, corner.vector);

                    let fractionalDX = dx/this.gridSize;
                    let fractionalDY = dy/this.gridSize;
                    let fractionalDT = dt/this.timeScale;

                    let smoothX = Utils.smooth(fractionalDX);
                    let smoothY = Utils.smooth(fractionalDY);
                    let smoothT = Utils.smooth(fractionalDT);

                    let weight = (smoothX+smoothY+smoothT)/3

                    weightedScalar.push(dotProduct*weight);
                }
            }
        }

        let weightSum = weightedScalar.reduce((a,b) => a + Math.abs(b), 0);
        if(weightSum === 0)
        {
            return 0;
        }

        let finalScalar = weightedScalar.reduce((a,b) => a + b, 0) / weightSum;
        
        return finalScalar;

    }
}