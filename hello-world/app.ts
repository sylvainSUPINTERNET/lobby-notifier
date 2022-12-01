import { APIGatewayProxyEvent, APIGatewayProxyResult, Context, DynamoDBRecord, DynamoDBStreamEvent, StreamRecord } from 'aws-lambda';
import {ApiGatewayManagementApi, DynamoDB} from 'aws-sdk';
import { DynamoDBClient, BatchExecuteStatementCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

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

const CONNECTION_TABLE_NAME = "simplechat_connections";


const client = new DynamoDBClient({ region: "eu-west-3" });
const ddb = new DynamoDB.DocumentClient({ region: "eu-west-3", apiVersion: '2012-08-10' });


// https://www.technicalfeeder.com/2021/02/how-to-check-if-a-object-implements-an-interface-in-typescript/#toc4


export const lambdaHandlerSendMessage = async ( event: APIGatewayProxyEvent | DynamoDBStreamEvent, context:Context ) => {



  const apigwWsEndpoint = `${process.env.WS_GATEWAY_APP_ID}.execute-api.${process.env.WS_AWS_REGION}.amazonaws.com/${process.env.WS_STAGE}`;

  //@ts-ignore
  if ( event.requestContext ) {
    //@ts-ignore
    const connectionId = event.requestContext.connectionId!;

    const apigwManagementApi = new ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      //@ts-ignore
      endpoint: event.requestContext.domainName + '/' + event.requestContext.stage,
      region: "eu-west-3"
    });
  
    let dataReceived:string = "";
      //@ts-ignore
    if ( event.body ) {
          //@ts-ignore
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
  }

  // event from DB strema
  //@ts-ignore
    if ( event.Records ) {
      //@ts-ignore
      const records:DynamoDBRecord[] = event.Records;

      records.forEach( async (record:DynamoDBRecord) => {

          if ( record.eventName === "INSERT" ) { 
            const streamRecord: StreamRecord|undefined = record.dynamodb;


            if ( streamRecord ) {
                if ( streamRecord.Keys ) {

                  // https://dynobase.dev/dynamodb-scan-vs-query/#:~:text=Difference%20Between%20Query%20and%20Scan%20in%20DynamoDB&text=While%20Scan%20is%20%22scanning%22%20through,see%20the%20difference%20in%20speed.
                  // https://dynobase.dev/dynamodb-pagination/
                  const insertedId:string = streamRecord.Keys.connectionId.S!;

                  const apigwManagementApi = new ApiGatewayManagementApi({
                    apiVersion: '2018-11-29',
                    //@ts-ignore
                    endpoint: apigwWsEndpoint,
                    region: "eu-west-3"
                  });

                  const params:ApiGatewayManagementApi.PostToConnectionRequest = {
                    Data: JSON.stringify({
                        message : `Welcome from DB stream ${insertedId}`
                      }),
                      ConnectionId: insertedId
                  };
                  
                  try {
                    await apigwManagementApi.postToConnection(params).promise();
                  } catch ( e ) {
                    console.log("Fail to send message", e);
                  }
                    
                    
                    // await apigwManagementApi.postToConnection().promise();
                  // if ( streamRecord.Keys![CONNECTION_TABLE_NAME].S === "connectionId" ) {
                  //   console.log("OK")
                  //   // TODO : issue how to get endpoint for API gateway when we receive event from dynamodb stream ( to send to all connectionId )

                  //   // https://catalog.us-east-1.prod.workshops.aws/workshops/56ef6f79-74e2-4710-aefb-10b9807057a9/en-US/persisting-data/dynamodb/query-and-scan

                  //   // const params = {
                  //   //   TABLE_NAME: CONNECTION_TABLE_NAME,
                  //   //   KeyConditionExpression: "#connectionId != \:connectionIdValue",
                  //   //   ExpressionAttributeNames: {
                  //   //     "#connectionId": "connectionId"
                  //   //   },
                  //   //   ExpressionAttributeValues: marshall({
                  //   //       "\:connectionIdValue": "TODO => connectionId ?" 
                  //   //   })
                  //   // }

                  //   // console.log("GOES HERE", streamRecord.Keys![CONNECTION_TABLE_NAME].S);
                  //   // ddb.
                  //   // const apigwManagementApi = new ApiGatewayManagementApi({
                  //   //   apiVersion: '2018-11-29',
                  //   //   //@ts-ignore
                  //   //   endpoint: event.requestContext.domainName + '/' + event.requestContext.stage,
                  //   //   region: "eu-west-3"
                  //   // });
                
                  //   // try {
                  //   //   const params:ApiGatewayManagementApi.PostToConnectionRequest = {
                  //   //     Data: JSON.stringify({
                  //   //         message : `You are in lobby ${lobby}`
                  //   //     }),
                  //   //     ConnectionId: connectionId
                  //   // };
                  //   // await apigwManagementApi.postToConnection(params).promise();
              
                  //   // } catch ( e ) {
                  //   //   console.log(e);
                  //   //   return { statusCode: 500, body: "Error while sending message" };
                  //   // }

                  // }


                }
            }

          }
      });

    return {
      statusCode: 200,
      body: "ok stream"
    }

  }

  return {
    statusCode: 500,
    body: "Error while sending message"
  }

};

// https://github.com/aws-samples/simple-websockets-chat-app/blob/master/onconnect/app.js
export const lambdaHandlerConnection = async ( event: APIGatewayProxyEvent, context:Context ) => {


    // Note you CANT send message from $connection route ( you will face GoneException 410 error )
    const connectionId = event.requestContext.connectionId!;


      try {
        console.log(event.requestContext.domainName + '/' + event.requestContext.stage);

        const putParams:DynamoDB.DocumentClient.PutItemInput = {
            TableName: process.env.TABLE_NAME!,
            Item: {
              connectionId: event.requestContext.connectionId,
              lobbyId: "NO_LOBBY"
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
