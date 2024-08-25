import { Injectable } from '@nestjs/common';

@Injectable()
export class NftService {
  getMaru() {
    return {
      schema: 'https://iampocket-relay-server.vercel.app/nft/maru',
      nftType: 'art.v0',
      name: 'maru',
      description: 'maru cute',
      image: 'ipfs://QmbqPdhA4LjnEXECnafJmxwMHwKu2Sd3tq6khRDPP52W2H',
    };
  }

  getMaruSleeping() {
    return {
      schema: 'https://iampocket-relay-server.vercel.app/nft/maru-sleeping',
      nftType: 'art.v0',
      name: 'maru-sleeping',
      description: 'maru coolcool',
      image: 'ipfs://QmXtJ7RZEkCKMuEB3vyswwdWNzP1iJsrqboqT1pEaYLCuL',
    };
  }

  getMaruGlasses() {
    return {
      schema: 'https://iampocket-relay-server.vercel.app/nft/maru-glasses',
      nftType: 'art.v0',
      name: 'maru-glasses',
      description: 'maru ganzi',
      image: 'ipfs://QmaqB7xUdqFdu6cVsiMiFZPH433YjaigXPtDEx3zQ6Zoyt',
    };
  }
}
