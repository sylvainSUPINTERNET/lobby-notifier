import { APIGatewayProxyEvent, APIGatewayProxyResult, Context, DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import {ApiGatewayManagementApi, DynamoDB} from 'aws-sdk';
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
const ddb = new DynamoDB.DocumentClient({ region: "eu-west-3", apiVersion: '2012-08-10' });


// https://www.technicalfeeder.com/2021/02/how-to-check-if-a-object-implements-an-interface-in-typescript/#toc4


export const lambdaHandlerSendMessage = async ( event: APIGatewayProxyEvent, context:Context ) => {

  const connectionId = event.requestContext.connectionId!;

  const apigwManagementApi = new ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: event.requestContext.domainName + '/' + event.requestContext.stage,
    region: "eu-west-3"
  });

  let dataReceived:string = "";
  if ( event.body ) {
    dataReceived = JSON.parse(event.body).data;
  }

  try {
        const params:ApiGatewayManagementApi.PostToConnectionRequest = {
          Data: JSON.stringify({
              message : `You send data : ${dataReceived === "" ? "NOTHIN" : dataReceived}`
          }),
          ConnectionId: connectionId
      };
      await apigwManagementApi.postToConnection(params).promise();

  } catch ( e ) {
    console.log(e);
    return { statusCode: 500, body: "Error while sending message" };
  }

  return {
    statusCode: 200,
    body: "Data send"
  }


};

// https://github.com/aws-samples/simple-websockets-chat-app/blob/master/onconnect/app.js
export const lambdaHandlerConnection = async ( event: APIGatewayProxyEvent, context:Context ) => {


    // Note you CANT send message from $connection route ( you will face GoneException 410 error )
    const connectionId = event.requestContext.connectionId!;

      try {

        const putParams:DynamoDB.DocumentClient.PutItemInput = {
            TableName: process.env.TABLE_NAME!,
            Item: {
              connectionId: event.requestContext.connectionId
            }
          };

        await ddb.put(putParams).promise();

      } catch ( e:any ) {

        if (e.statusCode === 410) {
          console.log(`Found stale connection, deleting ${connectionId}`);
          await ddb.delete({ TableName: process.env.TABLE_NAME!, Key: { connectionId } }).promise();
        } else {
          throw e;
        }

      }


      return { statusCode: 200, body: `Connected with success ${connectionId}` };
    
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
