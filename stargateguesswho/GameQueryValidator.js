const Joi = require('joi');

/*
This file contains all the schema validation for handling queries to the server.

@author: Peter Mitchell
@version 2022.1
 */

const createServerSchema = Joi.object().keys({
    action: Joi.string().trim().min(5).alphanum().required(),
    playerAuth: Joi.string().trim().length(16).alphanum().required()
});

const createPlayerSchema = Joi.object().keys({
    action: Joi.string().trim().min(5).alphanum().required(),
    playerName : Joi.string().trim().min(3).max(20).required()
});

const startGameSchema = Joi.object().keys({
    action: Joi.string().trim().min(5).alphanum().required(),
    playerAuth: Joi.string().trim().length(16).alphanum().required(),
    sessionCode : Joi.string().trim().alphanum().required()
});

const characterCommandSchema = Joi.object().keys({
    action: Joi.string().trim().min(5).alphanum().required(),
    playerAuth: Joi.string().trim().length(16).alphanum().required(),
    sessionCode : Joi.string().trim().alphanum().required(),
    characterID : Joi.number().required(),
    characterAction : Joi.string().trim().required()
});

// Verifies there is an action specified and then validates the required schema for the type of action.
const validate = function(data) {
    if(!('action' in data)) {
        return {error : "No action specified."};
    }

    if(data.action === 'createServer') {
        return createServerSchema.validate(data);
    } else if(data.action === 'createPlayer') {
        return createPlayerSchema.validate(data);
    } else if(data.action === 'startGame' || data.action === 'getState') {
        return startGameSchema.validate(data);
    } else if(data.action === 'characterCommand') {
        return characterCommandSchema.validate(data);
    }
    return {error : "Not a valid action."};
}

module.exports.validate = validate;