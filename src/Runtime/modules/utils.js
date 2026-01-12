export class Utils {
    constructor()
    {

    }

    static smooth(t)
    {
        return 6*Math.pow(t, 5) - 15*Math.pow(t, 4) + 10*Math.pow(t, 3);
    }

    static getDistance(x1,y1,x2,y2)
{
    let deltaX = x2 - x1;
    let deltaY = y2 - y1;
    return Math.hypot(deltaX, deltaY);
}
}