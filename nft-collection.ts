import {
  Args,
  boolToByte,
  stringToBytes,
  u256ToBytes,
  bytesToString,
  bytesToU256,
  u64ToBytes,
  bytesToU64,
} from '@massalabs/as-types';
import {
  _approve,
  _balanceOf,
  _constructor,
  _getApproved,
  _isApprovedForAll,
  _name,
  _ownerOf,
  _setApprovalForAll,
  _symbol,
  _update,
  _transferFrom,
  _transfer,
} from './NFT-internals';
import { setOwner, onlyOwner, ownerAddress } from '../utilities/ownership';
import {
  Storage,
  generateEvent,
  transferCoins,
  Address,
} from '@massalabs/massa-as-sdk';
import { Context, isDeployingContract } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly';

export const BASE_URI_KEY = stringToBytes('BASE_URI');
export const MAX_SUPPLY_KEY = stringToBytes('MAX_SUPPLY');
export const MINT_PRICE_KEY = stringToBytes('MINT_PRICE');
export const COUNTER_KEY = stringToBytes('COUNTER');

/**
 * @param binaryArgs - serialized strings representing the name and the symbol of the NFT
 *
 * @remarks This is the constructor of the contract. It can only be called once, when the contract is being deployed.
 * It expects two serialized arguments: the name and the symbol of the NFT.
 * Once the constructor has handled the deserialization, of the arguments,
 * it calls the _constructor function from the NFT-internals.
 *
 * Finally, it sets the owner of the contract to the caller of the constructor.
 */
export function constructor(binaryArgs: StaticArray<u8>): void {
  assert(isDeployingContract());
  const args = new Args(binaryArgs);
  const name = args.nextString().expect('name argument is missing or invalid');
  const symbol = args
    .nextString()
    .expect('symbol argument is missing or invalid');
  _constructor(name, symbol);
  setOwner(new Args().add(Context.caller().toString()).serialize());
  const baseURI = args
    .nextString()
    .expect('baseURI argument is missing or invalid');
  const maxSupply = args
    .nextU256()
    .expect('totalSupply argument is missing or invalid');
  const mintPrice = args
    .nextU64()
    .expect('mintPrice argument is missing or invalid');

  Storage.set(BASE_URI_KEY, stringToBytes(baseURI));
  Storage.set(MAX_SUPPLY_KEY, u256ToBytes(maxSupply));
  Storage.set(MINT_PRICE_KEY, u64ToBytes(mintPrice));
  Storage.set(COUNTER_KEY, u256ToBytes(u256.Zero));

  generateEvent('CHARLIE COLLECTION IS DEPLOYED');
}

export function name(): string {
  return _name();
}

export function symbol(): string {
  return _symbol();
}

export function baseURI(
  _: StaticArray<u8> = new StaticArray<u8>(0),
): StaticArray<u8> {
  return Storage.get(BASE_URI_KEY);
}

export function tokenURI(_args: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(_args);
  const tokenId = args
    .nextU256()
    .expect('token id argument is missing or invalid')
    .toString();

  const uri = bytesToString(Storage.get(BASE_URI_KEY));
  const key = uri + tokenId;
  return stringToBytes(key);
}

export function setBaseURI(_args: StaticArray<u8>): void {
  onlyOwner();
  const args = new Args(_args);
  const newBaseURI = args
    .nextString()
    .expect('tokenUri argument is missing or invalid');

  Storage.set(BASE_URI_KEY, stringToBytes(newBaseURI));
}
/**
 *
 * @param binaryArgs - serialized string representing the address whose balance we want to check
 * @returns a serialized u256 representing the balance of the address
 * @remarks As we can see, instead of checking the storage directly,
 * we call the _balanceOf function from the NFT-internals.
 */
export function balanceOf(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const address = args
    .nextString()
    .expect('address argument is missing or invalid');
  return u256ToBytes(_balanceOf(address));
}

/**
 *
 * @param binaryArgs - serialized u256 representing the tokenId whose owner we want to check
 * @returns a serialized string representing the address of owner of the tokenId
 */
export function ownerOf(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const tokenId = args
    .nextU256()
    .expect('tokenId argument is missing or invalid');
  return stringToBytes(_ownerOf(tokenId));
}

/**
 *
 * @param binaryArgs - serialized u256 representing the tokenId whose approved address we want to check
 * @returns a serialized string representing the address of the approved address of the tokenId
 */
export function getApproved(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const tokenId = args
    .nextU256()
    .expect('tokenId argument is missing or invalid');
  return stringToBytes(_getApproved(tokenId));
}

/**
 *
 * @param binaryArgs - serialized strings representing the address of an owner and an operator
 * @returns a serialized u8 representing a boolean value indicating if
 * the operator is approved for all the owner's tokens
 */
export function isApprovedForAll(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const owner = args
    .nextString()
    .expect('owner argument is missing or invalid');
  const operator = args
    .nextString()
    .expect('operator argument is missing or invalid');
  return boolToByte(_isApprovedForAll(owner, operator));
}

/**
 *
 * @param binaryArgs - serialized strings representing the address of the recipient and the tokenId to approve
 * @remarks This function is only callable by the owner of the tokenId or an approved operator.
 * Indeed, this will be checked by the _approve function of the NFT-internals.
 *
 */
export function approve(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const to = args.nextString().expect('to argument is missing or invalid');
  const tokenId = args
    .nextU256()
    .expect('tokenId argument is missing or invalid');
  _approve(to, tokenId);
}

/**
 *
 * @param binaryArgs - serialized arguments representing the address of the operator and a boolean value indicating
 * if the operator should be approved for all the caller's tokens
 *
 */
export function setApprovalForAll(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const to = args.nextString().expect('to argument is missing or invalid');
  const approved = args
    .nextBool()
    .expect('approved argument is missing or invalid');
  _setApprovalForAll(to, approved);
}

/**
 *
 * @param binaryArgs - serialized arguments representing the address of the sender,
 * the address of the recipient and the tokenId to transfer.
 *
 * @remarks This function is only callable by the owner of the tokenId or an approved operator.
 *
 */
export function transferFrom(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const from = args.nextString().expect('from argument is missing or invalid');
  const to = args.nextString().expect('to argument is missing or invalid');
  const tokenId = args
    .nextU256()
    .expect('tokenId argument is missing or invalid');
  _transferFrom(from, to, tokenId);
}

export function transfer(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const to = args.nextString().expect('to argument is missing or invalid');
  const tokenId = args
    .nextU256()
    .expect('tokenId argument is missing or invalid');
  _transfer(to, tokenId);
}

export function currentSupply(
  _: StaticArray<u8> = new StaticArray<u8>(0),
): StaticArray<u8> {
  return Storage.get(COUNTER_KEY);
}

/**
 *
 * @param binaryArgs - serialized arguments representing the address of the recipient and the tokenId to mint
 *
 * @remarks PUBLIC MINT EVENT
 */
export function mint(binaryArgs: StaticArray<u8>): void {
  // check max supply
  const maxSupply = bytesToU256(Storage.get(MAX_SUPPLY_KEY));
  assert(maxSupply > bytesToU256(currentSupply()), 'Max supply reached');

  // check mint price
  const mintPrice = bytesToU64(Storage.get(MINT_PRICE_KEY));
  assert(
    Context.transferredCoins() >= mintPrice,
    'You did not cover the mint fee, please send coins',
  );

  //mint next one
  const args = new Args(binaryArgs);
  const to = args.nextString().expect('please enter the target address.');
  const increment = bytesToU256(currentSupply()) + u256.One;
  Storage.set(COUNTER_KEY, u256ToBytes(increment));
  _update(to, increment, '');

  // Transfer coins to owner
  const transferInstant = bytesToString(ownerAddress([]));
  transferCoins(new Address(transferInstant), Context.transferredCoins());
}

/**
 *
 * @param binaryArgs - serialized arguments representing the address of the recipient and the tokenId to mint
 *
 * @remarks ADMIN MINT EVENT
 */
export function minta(binaryArgs: StaticArray<u8>): void {
  onlyOwner();
  // check max supply
  const maxSupply = bytesToU256(Storage.get(MAX_SUPPLY_KEY));
  assert(maxSupply > bytesToU256(currentSupply()), 'Max supply reached');

  //mint next one
  const args = new Args(binaryArgs);
  const to = args.nextString().expect('please enter the target address.');
  const increment = bytesToU256(currentSupply()) + u256.One;

  Storage.set(COUNTER_KEY, u256ToBytes(increment));
  _update(to, increment, '');
}

export function sndc(binaryArgs: StaticArray<u8>): void {
  onlyOwner();
  const args = new Args(binaryArgs);
  const targetAddress = args.nextString().expect('target address not entered.');
  const amount = args.nextU64().expect('target amount not entered.');

  transferCoins(new Address(targetAddress), amount);
}

export function changeMintPrice(binaryArgs: StaticArray<u8>): void {
  onlyOwner();
  const args = new Args(binaryArgs);
  const mintPrice = args.nextU64().expect('target amount not entered.');

  Storage.set(MINT_PRICE_KEY, u64ToBytes(mintPrice));
}
