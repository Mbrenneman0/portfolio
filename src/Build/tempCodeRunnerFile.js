/**
 * @file This file pulls data from github and generates the JSON file which will be used to populate information about my projects
 */

import fs from "fs";
import 'dotenv/config';

const DATA_PATH = "Data/projects.JSON";

const token = process.env.GH_API_KEY;
const header = {
    headers:
    {
        Authorization: `Bearer ${token}`,
        Accept: `application/vnd.github+json`
    }
}

const data = fs.readFileSync(DATA_PATH);
const projects = JSON.parse(data);

let projectOutput = [];

class Project
{
    #user;
    #projectKey;
    #languagesUrl;
    #metaUrl;
    #metaData
    #langData

    constructor(url)
    {
        this.repoUrl = url;
        this.#user = this.repoUrl.split('/')[3]
        this.#projectKey = this.repoUrl.split('/')[4]
        this.#languagesUrl = this.#generateLanguagesUrl();
        this.#metaUrl = this.#generateMetaUrl();
        this.#metaData = this.#fetchMetaData();
        this.#langData = this.#fetchLangData();

        this.pagesUrl = this.#generatePagesUrl();

        console.log(this.#metaData);
        console.log(this.#langData);

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
        return data;
    }

    async #fetchLangData()
    {
        let data = await fetch(this.#languagesUrl, header);
        return data;
    }
};

let test = new Project(projects['BreakoutJS']);