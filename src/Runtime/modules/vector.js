import {Utils} from "./utils.js";

export class Vector
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
        return this.strength * Math.sin(Vector.radians(this.angle))
    }
}