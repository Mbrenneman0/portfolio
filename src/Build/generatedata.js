/**
 * @file This file pulls data from github and generates the JSON file which will be used to populate information about my projects
 */

import fs from "fs";
import 'dotenv/config';

const DATA_PATH = "Data/projects.JSON";
const OUTPUT_PATH = "Data/project-data.JSON";

const token = process.env.GH_API_KEY;

let rateLimit;
let rateRemaining;
let numRequests = 0;

let header = {
    headers:
    {
        Authorization: `Bearer ${token}`,
        Accept: `application/vnd.github+json`
    }
};

if(!token)
{
    console.warn("WARNING: Token does not exist in the environment variables.");
    header = {
        headers:
        {
            Accept: `application/vnd.github+json`
        }
    };
}

if(!fs.existsSync(DATA_PATH))
{
    throw new Error(`Error: ${DATA_PATH} does not exist in the file system.`)
}

const data = fs.readFileSync(DATA_PATH);
const projects = JSON.parse(data);

let projectArray = [];



class Project
{
    #user;
    #projectKey;
    #languagesUrl;
    #metaUrl;
    #metaData;
    #langData;

    /**
     * Creates a new object with data from the repository.
     * Must run init() after declaring a new Project because constructor cannot be asynchronous
     * @param {string} name - Name to be displayed
     * @param {string} url - URL to repo
     * @param {string} img - Path to image to be displayed
     * @param {string} desc - Description of the project
     */
    constructor(name, url, img=null, desc=null)
    {
        this.name = name;
        this.repoUrl = url;
        this.img = img;
        this.desc = desc;

        if(name === null || this.name.trim() === "")
        {
            throw new Error("No name");
        }

        if(!this.repoUrl.startsWith("https://github.com/") || this.repoUrl.split('/').length !== 5)
        {
            throw new Error(`Invalid Url: ${this.repoUrl} for ${this.name}.`);
        }

        if(this.img === null)
        {
            console.warn(`WARNING: Url to image is missing. Project: ${this.name}.`);
        }
        else if(!fs.existsSync(this.img))
        {
            console.warn(`WARNING: Url to image points to a file that does not exist. Project: ${this.name}.`);
        }
    }

    async init()
    {
        this.#user = this.repoUrl.split('/')[3];
        this.#projectKey = this.repoUrl.split('/')[4];
        this.#languagesUrl = this.#generateLanguagesUrl();
        this.#metaUrl = this.#generateMetaUrl();
        this.pagesUrl = this.#generatePagesUrl();
        this.#metaData = await this.#fetchMetaData();
        this.#langData = await this.#fetchLangData();
        this.lastUpdate = this.#metaData.updated_at; //TODO: format date/time
        this.languages = this.#getLanguages(this.#langData);
        if(this.desc === null || this.desc.trim() === "")
        {
            this.desc = this.#metaData.description;
            if(this.desc === null)
            {
                console.warn(`WARNING: No description for ${this.name}.`);
            }
        }
    }

    #generatePagesUrl()
    {
        return `https://${this.#user}.github.io/${this.#projectKey}`;
    }

    #generateMetaUrl()
    {
        return `https://api.github.com/repos/${this.#user}/${this.#projectKey}`;
    }

    #generateLanguagesUrl()
    {
        return `https://api.github.com/repos/${this.#user}/${this.#projectKey}/languages`;
    }

    async #fetchMetaData()
    {
        let data = await fetch(this.#metaUrl, header);
        updateRateLimit(data.headers)
        if(!data.ok)
        {
            throw new Error(`Error: ${data.status} while fetching Metadata from GitHub API. Project: ${this.name}`);
        }
        return data.json();
    }

    async #fetchLangData()
    {
        let data = await fetch(this.#languagesUrl, header);
        updateRateLimit(data.headers)
        if(!data.ok)
        {
            throw new Error(`Error: ${data.status} while fetching Language data from GitHub API. Project: ${this.name}`);
        }
        return data.json();
    }

    /**
     * @param {object} langData an object listing languages as the key and the number of bytes for each language.
     * @returns an object with each language as a percent of the project, rounded to the nearest int.
     */
    #getLanguages(langData)
    {
        //calculate total number of bytes
        let totalBytes = 0;
        Object.keys(langData).forEach(key => {
            totalBytes += langData[key];
        })

        //convert the value to percentage
        let runningTotal = 0;
        Object.keys(langData).forEach(key =>{
            langData[key] = Math.round((langData[key]*100)/totalBytes);
            runningTotal += langData[key];
        })

        //resolve rounding errors
        if(runningTotal !== 100)
        {
            let lastKey = '';
            let keys = Object.keys(langData);
 
            if(100-runningTotal < 0)
            {
                //find the key that can be subtracted from without reducing to 0
                lastKey = keys.findLast(key => (langData[key] > (100-runningTotal)));
            }
            else
            {
                //find the smallest key to add to
                let smallestKeyValue = 100;
                lastKey = keys.findLast(key => {
                    if(langData[key] < smallestKeyValue)
                    {
                        smallestKeyValue = langData[key];
                        return true;
                    }
                    else
                    {
                        return false;
                    }
                })
            }
            
            langData[lastKey] += (100-runningTotal);
        }

        return langData;
    }

};

function updateRateLimit(header)
{
    rateLimit = header.get("x-ratelimit-limit");
    rateRemaining = header.get("x-ratelimit-remaining");
    numRequests++;
}


//build array of Project class
for(let i = 0; i < projects.length; i++)
{
    try
    {
        let item = projects[i];
        let newProject = new Project(item.name, item.url, item.img, item.desc)
        await newProject.init();
        projectArray.push(newProject);
    }
    catch (error)
    {
        console.error(error);
        if(rateRemaining === 0)
        {
            throw new Error(`Error: Rate limit exceeded after ${numRequests} requests. Try again later.`);
        }
    }
}

let outputObject = {
    header: {
        date: new Date() //TODO: format time and date
    },
    repos: projectArray
}

let outputJSON = JSON.stringify(outputObject, null, "\t");

fs.writeFileSync(OUTPUT_PATH, outputJSON);

console.log(`JSON updated successfully at "${OUTPUT_PATH}"`);
console.log(`Rate Limit: ${rateLimit}`);
console.log(`Rate Remaining: ${rateRemaining}`);
console.log(`Rate Used: ${numRequests}`);