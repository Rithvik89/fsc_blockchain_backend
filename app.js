'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');

const channelName = 'mychannel';
const chaincodeName = 'basic';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'appUser';

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded());
const port = 3000;

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});

// function prettyJSONString(inputString) {
// 	return JSON.stringify(JSON.parse(inputString), null, 2);
// }

async function makeUser(){
	const ccp = buildCCPOrg1();

	// build an instance of the fabric ca services client based on
	// the information in the network configuration
	const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

	// setup the wallet to hold the credentials of the application user
	const wallet = await buildWallet(Wallets, walletPath);

	// in a real application this would be done on an administrative flow, and only once
	await enrollAdmin(caClient, wallet, mspOrg1);

	// in a real application this would be done only when a new user was required to be added
	// and would be part of an administrative flow
	await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');

	return [wallet,ccp];
}

async function main() {
	try {
		// build an in memory object with the network configuration (also known as a connection profile)
		// eslint-disable-next-line no-unused-vars

		const [wallet,ccp] = await makeUser();

		// Create a new gateway instance for interacting with the fabric network.
		// In a real application this would be done as the backend server session is setup for
		// a user that has been verified.
		const gateway = new Gateway();

		try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});

			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			const contract = network.getContract(chaincodeName);

			app.get('/', async (req, res) => {
				console.log('\n--> Evaluate Transaction: ReadAsset, function returns an asset with a given assetID');
				let result = await contract.evaluateTransaction('GetAllAssets',0,0);
				res.send(result);
			});

			app.get('/Quality', async (req, res) => {
				console.log('\n--> Evaluate Transaction: ReadAsset, function returns an asset with a given assetID');
				let result = await contract.evaluateTransaction('GetAllAssets',1,0);
				res.send(result);
			});

			app.get('/:id', async (req, res) => {
				console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
				let result = await contract.evaluateTransaction('ReadAsset', `${req.params.id}`);
				res.send(result);
			});

			app.post('/',async(req,res)=>{
				console.log('\n--> Submit Transaction: Create Asset');
				await contract.submitTransaction('CreateAsset', req.body.id, req.body.item , req.body.weight ,req.body.packedDate, req.body.packagedLocation, req.body.value ,req.body.owner);
				console.log('*** Result: committed');
				res.send('Inserted Successfully');
			});

			app.put('/',async(req,res)=>{
				console.log('\n--> Submit Transaction: Update Asset');
				await contract.submitTransaction('UpdateAsset', req.body.id, req.body.item , req.body.weight ,req.body.packagedDate, req.body.packagedLocation, req.body.value ,req.body.owner);
				console.log('*** Result: committed');
				res.send('Updated Successfully');
			});

			app.delete('/',async(req,res)=>{
				console.log('\n--> Submit Transaction: Delete Asset');
				await contract.submitTransaction('DeleteAsset',req.body.id);
				console.log('*** Result: committed');
				res.send('Deleted Successfully');
			});

			app.post('/Quality',async(req,res)=>{
				console.log('\n--> Submit Transaction: Create Asset Quality');
				await contract.submitTransaction('CreateAssetQuality', req.body.id, req.body.temperature , req.body.humidity ,req.body.gas);
				console.log('*** Result: committed');
				res.send('Inserted Successfully');
			});


		} catch(error){
			console.error('failed to connect to gateway');
		}
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
	}
}

main();


// console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
// let result = await contract.evaluateTransaction('GetAllAssets');
// console.log(`*** Result: ${prettyJSONString(result.toString())}`);

// console.log('\n--> Evaluate Transaction: ReadAsset, function returns an asset with a given assetID');
// result = await contract.evaluateTransaction('ReadAsset', 'asset2');
// console.log(`*** Result: ${prettyJSONString(result.toString())}`);

// console.log('\n--> Evaluate Transaction: AssetExists, function returns "true" if an asset with given assetID exist');
// result = await contract.evaluateTransaction('AssetExists', 'asset1');
// console.log(`*** Result: ${prettyJSONString(result.toString())}`);

// console.log('\n--> Submit Transaction: UpdateAsset asset3, change the appraisedValue to 350');
// await contract.submitTransaction('UpdateAsset', 'asset3', 'Melon', 10,'05-10-2022', 'warangal', '350','Reliance Retail store');
// console.log('*** Result: committed');

// console.log('\n--> Submit Transaction: CreateAssetQuality asset1Quality');
// await contract.submitTransaction('CreateAssetQuality', 'asset1Quality', 25,10.01);
// console.log('*** Result: committed');




