const Joi = require('joi');

/*
This file contains all the schema validation for handling queries to the server.

@author: Peter Mitchell
@version 2022.1
 */

const testConnectionSchema = Joi.object().keys({
    action : Joi.string().trim().min(5).alphanum().required()
});

const createServerSchema = Joi.object().keys({
    action : Joi.string().trim().min(5).alphanum().required(),
    playerAuth : Joi.string().trim().length(16).alphanum().required()
});

const createPlayerSchema = Joi.object().keys({
    action : Joi.string().trim().min(5).alphanum().required(),
    playerName : Joi.string().trim().min(3).max(20).required()
});

const startGameSchema = Joi.object().keys({
    action : Joi.string().trim().min(5).alphanum().required(),
    playerAuth : Joi.string().trim().length(16).alphanum().required(),
    sessionCode : Joi.string().trim().alphanum().required()
});

const characterCommandSchema = Joi.object().keys({
    action : Joi.string().trim().min(5).alphanum().required(),
    playerAuth : Joi.string().trim().length(16).alphanum().required(),
    sessionCode : Joi.string().trim().alphanum().required(),
    characterID : Joi.number().required(),
    characterAction : Joi.string().trim().required()
});

const characterCollectionSchema = Joi.object().keys({
    action : Joi.string().trim().min(5).alphanum().required(),
    playerAuth : Joi.string().trim().length(16).alphanum().required(),
    sessionCode : Joi.string().trim().alphanum().required(),
    characterSet : Joi.string().trim().regex(/^[A-Fa-f0-9]{40}$/).required()
});

// Verifies there is an action specified and then validates the required schema for the type of action.
const validate = function(data) {
    if (!('action' in data))
    {
        return {error : "No action specified."};
    }

    if (data.action === 'createServer')
    {
        return createServerSchema.validate(data);
    }
    else if (data.action === 'createPlayer')
    {
        return createPlayerSchema.validate(data);
    }
    else if (data.action === 'startGame' || data.action === 'getState' || data.action === 'joinServer')
    {
        return startGameSchema.validate(data);
    }
    else if (data.action === 'characterCommand')
    {
        return characterCommandSchema.validate(data);
    }
    else if (data.action === 'setCharacterCollection')
    {
        return characterCollectionSchema.validate(data);
    }
    else if (data.action === 'testconnection')
    {
        return testConnectionSchema.validate(data);
    }

    return {error : "\"" + data.action + "\" is not a valid action."};
}

module.exports.validate = validate;