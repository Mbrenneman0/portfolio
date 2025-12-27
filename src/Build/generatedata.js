/**
 * @file This file pulls data from github and generates the JSON file which will be used to populate information about my projects
 */

import fs from "fs";
import 'dotenv/config';

const DATA_PATH = "Data/projects.JSON";
const OUTPUT_PATH = "Data/project-data.JSON";

const token = process.env.GH_API_KEY;
const header = {
    headers:
    {
        Authorization: `Bearer ${token}`,
        Accept: `application/vnd.github+json`
    }
};

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
     * Must run init() after declaring a new Project
     * @param {string} url - URL to repo
     */
    constructor(url)
    {
        this.repoUrl = url;
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
        this.description = this.#metaData.description;
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
        return data.json();
    }

    async #fetchLangData()
    {
        let data = await fetch(this.#languagesUrl, header);
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
            if(100-runningTotal < 0)
            {
                //find the key that can be subtracted from without reducing to 0
                lastKey = Object.keys(langData).findLast(key => (langData[key] > (100-runningTotal)));
            }
            else
            {
                //find the smallest key to add to
                let smallestKeyValue = 100;
                lastKey = Object.keys(langData).findLast(key => {
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


//build array of Project class
for(let i = 0; i < projects.length; i++)
{
    let newProject = new Project(projects[i])
    await newProject.init();
    projectArray.push(newProject);
}

let outputJSON = JSON.stringify(projectArray)

fs.writeFileSync(OUTPUT_PATH, outputJSON)