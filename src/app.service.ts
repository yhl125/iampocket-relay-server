import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validate } from '@telegram-apps/init-data-node';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitNetwork, AuthMethodScope, LIT_RPC } from '@lit-protocol/constants';
import { ethers, Wallet } from 'ethers';
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { parseInitData } from '@telegram-apps/sdk';
import { IRelayPKP, AuthSig } from '@lit-protocol/types';
import {
  datil,
  datilDev,
  datilTest,
  habanero,
  manzano,
} from '@lit-protocol/contracts';
import { AddPayeeDto, GetPayerAuthSigDto } from './lit-pay.dto';
import { CapacityToken } from './lit';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}
  getHello(): string {
    return 'Hello World!';
  }

  async validateData(data: string, pkpTokenId: string): Promise<boolean> {
    const secretToken = this.configService.get<string>('TELGRAM_BOT_TOKEN');
    const parsedInitData = parseInitData(data);
    const userId = parsedInitData.user.id.toString();
    const litContracts = await this.connectLitContractsToDatil();
    const authMethods =
      await litContracts.pkpPermissionsContract.read.getPermittedAuthMethods(
        pkpTokenId,
      );
    // find the auth method id that matches the telegram user id, if it exists then return true, else return false
    // convert userId to hex
    const hexUserId = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(userId));

    const authMethod = authMethods.find(
      (authMethod) => authMethod[1] === hexUserId,
    );
    if (!authMethod) {
      throw new Error('User is not permitted to use this PKP');
    }

    validate(data, secretToken);
    return true;
  }

  private validateAndGetUserId(data: string) {
    const secretToken = this.configService.get<string>('TELGRAM_BOT_TOKEN');
    validate(data, secretToken);
    const parsedInitData = parseInitData(data);
    return parsedInitData.user.id.toString();
  }

  async createPkpAndPermitLitActionToUsePkp(data: string) {
    await this.connectLitNodeClientToDatil();
    const litContracts = await this.connectLitContractsToDatil();
    const telegramUserId = this.validateAndGetUserId(data);
    const pkp = await this.mintPkpWithLitContracts(litContracts);
    await this.addPermittedAuthMethodToPkp(litContracts, pkp, telegramUserId);
    const ipfsCid = await this.convertLitActionCodeToIpfsCid();
    await this.permitLitActionToUsePkp(litContracts, pkp, ipfsCid);
    await this.sendPkpToItself(litContracts, pkp);
    return pkp;
  }

  async getPkpsForTelegramUser(data: string): Promise<IRelayPKP[]> {
    const telegramUserId = this.validateAndGetUserId(data);
    console.log(telegramUserId);
    const litContracts = await this.connectLitContractsToDatil();
    const hexUserId = ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes(telegramUserId),
    );
    const tokenIds =
      await litContracts.pkpPermissionsContract.read.getTokenIdsForAuthMethod(
        89989,
        hexUserId,
      );
    console.log(tokenIds);
    const pkps: IRelayPKP[] = [];
    for (let i = 0; i < tokenIds.length; i++) {
      const pubkey = await litContracts.pkpPermissionsContract.read.getPubkey(
        tokenIds[i],
      );
      if (pubkey) {
        const ethAddress = ethers.utils.computeAddress(pubkey);
        pkps.push({
          tokenId: tokenIds[i].toHexString(),
          publicKey: pubkey,
          ethAddress: ethAddress,
        });
      }
    }
    console.log(pkps);
    return pkps;
  }

  private async connectLitNodeClientToDatil() {
    const client = new LitNodeClient({
      litNetwork: LitNetwork.Datil,
    });
    await client.connect();
  }

  private async connectLitContractsToDatil() {
    const litContracts = new LitContracts({
      signer: new Wallet(
        this.configService.get<string>('EOA_PRIVATE_KEY'),
        new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE),
      ),
      debug: false,
      network: LitNetwork.Datil,
    });

    await litContracts.connect();
    return litContracts;
  }

  private async mintPkpWithLitContracts(litContracts: LitContracts) {
    const eoaWalletOwnedPkp = (
      await litContracts.pkpNftContractUtils.write.mint()
    ).pkp;
    return eoaWalletOwnedPkp;
  }

  private async addPermittedAuthMethodToPkp(
    litContracts: LitContracts,
    pkp: {
      tokenId: any;
      publicKey: string;
      ethAddress: string;
    },
    telegramUserId: string,
  ) {
    const customAuthMethod = {
      authMethodType: 89989,
      authMethodId: telegramUserId,
    };
    const receipt = await litContracts.addPermittedAuthMethod({
      pkpTokenId: pkp.tokenId,
      authMethodType: customAuthMethod.authMethodType,
      authMethodId: customAuthMethod.authMethodId,
      authMethodScopes: [AuthMethodScope.SignAnything],
    });
    return receipt;
  }

  private createLitActionCode() {
    const litActionCode = `(async () => {
      const tokenId = await Lit.Actions.pubkeyToTokenId({ publicKey: pkpPublicKey });
      const permittedAuthMethods = await Lit.Actions.getPermittedAuthMethods({ tokenId });
      const isPermitted = permittedAuthMethods.some(async (permittedAuthMethod) => {
        if (permittedAuthMethod["auth_method_type"] === "0x15f85" && 
            permittedAuthMethod["id"] === customAuthMethod.authMethodId) {
          const response = await fetch('https://iampocket-relay-server.vercel.app/validate', {
            method: 'POST',
            body: JSON.stringify({
              'initDataRaw': initDataRaw,
              'pkpTokenId': tokenId,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
          });
          return response.ok;
        }
        return false;
      });
      LitActions.setResponse({ response: isPermitted ? "true" : "false" });
    })();`;
    return litActionCode;
  }

  private async convertLitActionCodeToIpfsCid() {
    // const litActionCode = this.createLitActionCode();
    // // eslint-disable-next-line @typescript-eslint/no-var-requires
    // const ipfsHelpers = require('ipfs-helpers');
    // const ipfsHash = await ipfsHelpers.stringToCidV0(litActionCode);
    const ipfsHash = 'QmNwLV5GdY8GPsiJ7cxErbSTmKVFAusTZp2ywRwszLN4cS';
    return ipfsHash;
  }

  private async permitLitActionToUsePkp(
    litContracts: LitContracts,
    pkp: {
      tokenId: any;
      publicKey: string;
      ethAddress: string;
    },
    ipfsCid: string,
  ) {
    const receipt = await litContracts.addPermittedAction({
      ipfsId: ipfsCid,
      pkpTokenId: pkp.tokenId,
      authMethodScopes: [AuthMethodScope.SignAnything],
    });
    return receipt;
  }

  private async sendPkpToItself(
    litContracts: LitContracts,
    pkp: {
      tokenId: any;
      publicKey: string;
      ethAddress: string;
    },
  ) {
    const wallet = new Wallet(
      this.configService.get<string>('EOA_PRIVATE_KEY'),
      new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE),
    );
    const receipt = await litContracts.pkpNftContract.write.transferFrom(
      wallet.address,
      pkp.ethAddress,
      pkp.tokenId,
    );
    return receipt;
  }

  async registerPayerHandler(
    network: LitNetwork,
    initDataRaw: string,
  ): Promise<{
    payerWalletAddress: string;
    payerPrivateKey: string;
  }> {
    // const secretToken = this.configService.get<string>('TELGRAM_BOT_TOKEN');
    // validate(initDataRaw, secretToken);
    const privateKey = Wallet.createRandom().privateKey;
    const wallet = new Wallet(
      privateKey,
      new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE),
    );

    return this.fundWallet(wallet)
      .then(
        async (wallet: Wallet) =>
          await this.createCapacityCredits(wallet, network),
      )
      .then((wallet: Wallet) => {
        return {
          payerWalletAddress: wallet.address,
          payerPrivateKey: wallet.privateKey,
        };
      });
  }

  async fundWallet(wallet: Wallet) {
    console.log(`Funding wallet ${wallet.address} with 0.001 LIT`);

    const tx = await this.sendLitTokens(wallet.address, '0.001');

    if (!tx) {
      throw new Error('Failed to fund wallet');
    }

    console.log(`Funded wallet ${wallet.address} with 0.001 LIT`);

    return wallet;
  }

  private async sendLitTokens(recipientPublicKey: string, amount: string) {
    const signer = new Wallet(
      this.configService.get<string>('EOA_PRIVATE_KEY'),
      new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE),
    );

    const tx = await signer.sendTransaction({
      to: recipientPublicKey,
      value: ethers.utils.parseEther(amount),
    });

    const reciept = await tx.wait();

    console.log('Sent LIT tokens', reciept.blockHash);

    return reciept.blockHash;
  }

  private async createCapacityCredits(wallet: Wallet, network: LitNetwork) {
    console.log(`Minting capacity credits for ${wallet.address}`);
    const tx = await this.mintCapacityCredits(wallet, network);

    if (!tx) {
      throw new Error('Failed to mint capacity credits');
    }

    console.log(`Minted capacity credits for ${wallet.address}`);
    console.log('NFT id is', tx.capacityTokenId);

    return wallet;
  }

  private async mintCapacityCredits(signer: Wallet, network: LitNetwork) {
    if (network === 'datil-dev' || network === 'cayenne') {
      throw new Error(`Payment delegation is not available on ${network}`);
    }

    const contract = this.getContractFromWorker(
      network,
      'RateLimitNFT',
      signer,
    );

    if (!contract) {
      throw new Error('Contract is not available');
    }

    // set the expiration to midnight, 15 days from now
    const timestamp = Date.now() + 15 * 24 * 60 * 60 * 1000;
    const futureDate = new Date(timestamp);
    futureDate.setUTCHours(0, 0, 0, 0);

    // Get the Unix timestamp in seconds
    const expires = Math.floor(futureDate.getTime() / 1000);
    console.log('expires is set to', expires);

    const requestsPerKilosecond = 150;

    let cost;
    try {
      cost = await contract.functions.calculateCost(
        requestsPerKilosecond,
        expires,
      );
    } catch (e) {
      console.error(
        'Unable to estimate gas cost for minting capacity credits',
        e,
      );
      return;
    }

    const tx = await contract.functions.mint(expires, {
      value: cost.toString(),
    });
    console.log('mint tx hash: ', tx.hash);
    const res = await tx.wait();

    const tokenIdFromEvent = res.events[0].topics[3];

    return { tx, capacityTokenId: tokenIdFromEvent };
  }

  private getContractFromWorker(
    network: LitNetwork,
    contractName: string,
    signer: ethers.Wallet,
  ): ethers.Contract {
    let contractsDataRes;
    switch (network) {
      case 'manzano':
        contractsDataRes = manzano;
        break;
      case 'habanero':
        contractsDataRes = habanero;
        break;
      case 'datil-dev':
        contractsDataRes = datilDev;
        break;
      case 'datil-test':
        contractsDataRes = datilTest;
        break;
      case 'datil':
        contractsDataRes = datil;
        break;
      default:
        throw new Error(`Unsupported network: ${network}`);
    }

    const contractList = contractsDataRes.data as any;

    console.log(
      `Attempting to get contract "${contractName} from "${network}"`,
    );

    // find object where name is == contractName
    const contractData = contractList.find(
      (contract: any) => contract.name === contractName,
    );

    // -- validate
    if (!contractData) {
      throw new Error(`No contract found with name ${contractName}`);
    }

    const contract = contractData.contracts[0];
    console.log(`Contract address: ${contract.address_hash}"`);

    // -- ethers contract
    console.log(signer);
    console.log(signer.provider);
    const ethersContract = new ethers.Contract(
      contract.address_hash,
      contract.ABI,
      signer,
    );

    return ethersContract;
  }

  async addPayeeHandler(addPayeeDto: AddPayeeDto) {
    // const secretToken = this.configService.get<string>('TELGRAM_BOT_TOKEN');
    // validate(addPayeeDto.initDataRaw, secretToken);

    if (!ethers.utils.isAddress(addPayeeDto.payee)) {
      throw new Error('Invalid payee address');
    }

    const wallet = new Wallet(
      addPayeeDto.payerPrivateKey,
      new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE),
    );
    let error: string | boolean = false;

    try {
      const tx = await this.addPaymentDelegationPayee(
        wallet,
        [addPayeeDto.payee],
        addPayeeDto.network,
      );

      if (!tx) {
        throw new Error('Failed to add payee: delegation transaction failed');
      }
    } catch (err) {
      console.error('Failed to add payee', err);
      error = (err as Error).toString();
    }

    if (error) {
      throw new Error(error);
    } else {
      return true;
    }
  }

  async addPaymentDelegationPayee(
    wallet: Wallet,
    payeeAddresses: string[],
    network: LitNetwork,
  ) {
    if (network === 'datil-dev' || network === 'cayenne') {
      throw new Error(`Payment delegation is not available on ${network}`);
    }

    // get the first token that is not expired
    const capacityTokens: CapacityToken[] = await this.queryCapacityCredits(
      wallet,
      network,
    );
    console.log('Got capacity tokens', JSON.stringify(capacityTokens, null, 2));
    const capacityToken = capacityTokens.find((token) => !token.isExpired);

    let tokenId: number | null = null;

    if (!capacityToken) {
      // mint a new token
      const minted = await this.mintCapacityCredits(wallet, network);

      if (!minted) {
        throw new Error('Failed to mint capacity credits');
      }

      console.log(
        'No capacity token found, minted a new one:',
        minted.capacityTokenId,
      );
      tokenId = minted.capacityTokenId;
    } else {
      tokenId = capacityToken.tokenId;
    }

    if (!tokenId) {
      throw new Error('Failed to get ID for capacity token');
    }

    // add payer in contract
    const paymentDelegationContract = this.getContractFromWorker(
      network,
      'PaymentDelegation',
      wallet,
    );

    const tx =
      await paymentDelegationContract.functions.delegatePaymentsBatch(
        payeeAddresses,
      );
    console.log('tx hash for delegatePaymentsBatch()', tx.hash);
    await tx.wait();
    return tx;
  }

  async queryCapacityCredits(signer: Wallet, network: LitNetwork) {
    if (network === 'datil-dev' || network === 'cayenne') {
      throw new Error(`Payment delegation is not available on ${network}`);
    }

    const contract = this.getContractFromWorker(
      network,
      'RateLimitNFT',
      signer,
    );
    const count = parseInt(await contract.functions.balanceOf(signer.address));

    return Promise.all(
      [...new Array(count)].map((_, i) =>
        this.queryCapacityCredit(contract, signer.address, i),
      ),
    ) as Promise<CapacityToken[]>;
  }

  async queryCapacityCredit(
    contract: ethers.Contract,
    owner: string,
    tokenIndexForUser: number,
  ) {
    console.log(
      `Querying capacity credit for owner ${owner} at index ${tokenIndexForUser}`,
    );

    const tokenId = (
      await contract.functions.tokenOfOwnerByIndex(owner, tokenIndexForUser)
    ).toString();
    console.log(`Actually querying tokenId ${tokenId}`);

    try {
      const [URI, capacity, isExpired] = await Promise.all([
        contract.functions.tokenURI(tokenId).then(this.normalizeTokenURI),
        contract.functions.capacity(tokenId).then(this.normalizeCapacity),
        contract.functions.isExpired(tokenId),
      ]);

      return {
        tokenId,
        URI,
        capacity,
        isExpired: isExpired[0],
      } as CapacityToken;
    } catch (e) {
      // Makes the stack trace a bit more clear as to what actually failed
      throw new Error(
        `Failed to fetch details for capacity token ${tokenId}: ${e}`,
      );
    }
  }

  private normalizeTokenURI(tokenURI: string) {
    const base64 = tokenURI[0];

    const data = base64.split('data:application/json;base64,')[1];
    const dataToString = Buffer.from(data, 'base64').toString('binary');

    return JSON.parse(dataToString);
  }

  private normalizeCapacity(capacity: any) {
    const [requestsPerMillisecond, expiresAt] = capacity[0];

    return {
      requestsPerMillisecond: parseInt(requestsPerMillisecond.toString()),
      expiresAt: {
        timestamp: parseInt(expiresAt.toString()),
      },
    };
  }

  async getPayerAuthSig(data: GetPayerAuthSigDto): Promise<AuthSig> {
    // const secretToken = this.configService.get<string>('TELGRAM_BOT_TOKEN');
    // validate(data.initDataRaw, secretToken);

    const payerWallet = new ethers.Wallet(data.payerPrivateKey);
    const client = new LitNodeClient({
      litNetwork: LitNetwork.Datil,
    });
    await client.connect();
    const { capacityDelegationAuthSig } =
      await client.createCapacityDelegationAuthSig({
        dAppOwnerWallet: payerWallet,
        delegateeAddresses: [data.payee],
      });
    return capacityDelegationAuthSig;
  }
}
