import { Controller, Get } from '@nestjs/common';
import { NftService } from './nft.service';

@Controller('nft')
export class NftController {
  constructor(private readonly nftService: NftService) {}

  @Get('maru')
  getMaru() {
    return this.nftService.getMaru();
  }

  @Get('maru-sleeping')
  getMaruSleeping() {
    return this.nftService.getMaruSleeping();
  }

  @Get('maru-glasses')
  getMaruGlasses() {
    return this.nftService.getMaruGlasses();
  }
}
