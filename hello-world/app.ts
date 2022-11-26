import { APIGatewayProxyEvent, APIGatewayProxyResult, Context, DynamoDBRecord, DynamoDBStreamEvent  } from 'aws-lambda';

import { DynamoDBClient, BatchExecuteStatementCommand } from "@aws-sdk/client-dynamodb";

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */



/**
 * From template.yml table dynamodb definition
 */
const LOBBY_KEY = "lobby";

const client = new DynamoDBClient({ region: "eu-west-3" });

// https://www.technicalfeeder.com/2021/02/how-to-check-if-a-object-implements-an-interface-in-typescript/#toc4


export const lambdaHandlerConnection = async ( event: APIGatewayProxyEvent | DynamoDBStreamEvent, context:Context ) => {
    
};


export const lambdaHandler = async ( event: APIGatewayProxyEvent | DynamoDBStreamEvent, context:Context ): Promise<APIGatewayProxyResult> => {
    let response: APIGatewayProxyResult;

    console.log("EVENT")
    console.log(event)
    console.log("============")
    
    // Since we don't know what we received ... ( we could use User defined Type Guards, but it's overkill)
    //@ts-ignore 
    if ( event.Records ) {
        console.log("YOP")
        const ev: DynamoDBStreamEvent = event as DynamoDBStreamEvent;
        console.log(ev);


        ev.Records.forEach( (record: DynamoDBRecord) => {
            console.log(record);
        });

        // const filteredRecords = ev.Records.filter( (record: DynamoDBRecord ) => {
        //     console.log(record)

        //     // if ( ( record.eventName === "INSERT" || record.eventName === "MODIFY" ) && record.dynamodb?.Keys.ID.S === LOBBY_KEY ) {
                
        //     // }

        // });

        // const filteredRecords = ev.Records.filter((record) => {
        //     return ( record.eventName === "INSERT" || record.eventName === "MODIFY" ) && record.dynamodb.Keys.ID.S !== COUNTER_KEY
        // });
    }

    try {
        response = {
            statusCode: 200,
            body: JSON.stringify({
                message: 'hello world',
            }),
        };
    } catch (err: unknown) {
        console.error(err);
        response = {
            statusCode: 500,
            body: JSON.stringify({
                message: err instanceof Error ? err.message : 'some error happened',
            }),
        };
    }

    return response;
};
