/*global artifacts, web3, contract, before, it, context*/
/*eslint no-undef: "error"*/

const { expect } = require('chai');
const { constants, time, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const GQC_Stake = artifacts.require('GQC_Stake');
const ERC20 = artifacts.require('ERC20Mock');

const { toWei } = web3.utils;


contract('GQC_Stake', (accounts) => {
    let incentives;
    let stakingRewards;
    let rewardToken;
    let stakingToken;
    let rescueToken;

    let stakeAmount;
    let halfStake;
    let quarterStake
    let irregularStake;
    let irregularStake2;
    let tinyStake;
    let rewardAmount;
    let _initreward = (BigInt(925 * 100 * 1000000000000000000)).toString(); // "92500000000000003145728"
    let reward = BigInt(30 * 100 * 1000000000000000000).toString();
    let expireAt = `${((new Date().getTime() / 1000) + 14 * 24 * 60 * 60).toFixed()}`;
    let _starttime = 1600560000; // 2020-09-20 00:00:00 (UTC +00:00)
    let _durationDays = 7;
    let initTime;
    let _badReward;

    let governor = accounts[0];

    before('!! deploy setup', async () => {
        stakingRewards = await GQC_Stake.new({ from: governor });
        rewardToken = await ERC20.new('Reward token', 'REWARD', { from: governor });
        stakingToken = await ERC20.new('Staking token', 'STAKING', { from: governor })
    });
    context('» contract is not initialized yet', () => {
        context('» parameters are valid', () => {
            it('it initializes contract', async () => {
                await stakingRewards.GQC_Stake_init(governor, stakingToken.address, rewardToken.address, { from: governor });
                await stakingRewards.setRewardDistribution(governor, { from: governor });
                await rewardToken.transfer(stakingRewards.address, _initreward, { from: governor });
                await stakingRewards.notifyRewardAmount(reward, expireAt, {from: governor});
            });
        });
        context('» deploying account is owner', () => {
            it('returns correct owner', async () => {
                expect(governor).to.equal(await stakingRewards.owner());
            });
        });
        context('» periodFinish == 0 on deployment', () => {
            before('!! deploy contract', async () => {
                incentives = await GQC_Stake.new({ from: governor });
            });
            it(' == 0', async () => {
                expect((await incentives.periodFinish()).toNumber()).to.equal(0);
            });
        });
        context('» governor parameter is not valid', () => {
            before('!! deploy contract', async () => {
                incentives = await GQC_Stake.new({ from: governor });
            });
            it('it reverts', async () => {
                await expectRevert(incentives.GQC_Stake_init(constants.ZERO_ADDRESS, stakingToken.address, rewardToken.address, { from: governor }), 'governor cannot be null');
            });
        });
        context('» staking token parameter is not valid', () => {
            before('!! deploy contract', async () => {
                incentives = await GQC_Stake.new({ from: governor });
            });
            it('it reverts', async () => {
                await expectRevert(incentives.GQC_Stake_init(governor, constants.ZERO_ADDRESS, rewardToken.address, { from: governor }), 'stakingToken cannot be null');
            });
        });
        context('» reward token parameter is not valid', () => {
            before('!! deploy contract', async () => {
                incentives = await GQC_Stake.new({ from: governor });
            });
            it('it reverts', async () => {
                await expectRevert(incentives.GQC_Stake_init(governor, stakingToken.address, constants.ZERO_ADDRESS, { from: governor }), 'rewardToken cannot be null');
            });
        });
    });
    context('» contract is already initialized', () => {
        // contract has already been initialized during setup
        it('it reverts', async () => {
            await expectRevert(stakingRewards.GQC_Stake_init(governor, stakingToken.address, rewardToken.address, { from: governor }), 'Contract instance has already been initialized');
        });
    });
    context('# stake', () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                stakingRewards = await GQC_Stake.new({ from: governor });
                rewardToken = await ERC20.new('Reward token', 'REWARD', { from: governor });
                stakingToken = await ERC20.new('Staking token', 'STAKING', { from: governor })
                stakeAmount = toWei('100');
            });
            context('» stake parameter is not valid', () => {
                before('!! fund & initialize contract', async () => {
                    await stakingRewards.GQC_Stake_init(governor, stakingToken.address, rewardToken.address, { from: governor });
                    await stakingRewards.setRewardDistribution(governor, { from: governor });
                    await rewardToken.transfer(stakingRewards.address, _initreward, { from: governor });
                    await stakingRewards.notifyRewardAmount(reward, expireAt, {from: governor});
                });
                it('it reverts', async () => {
                    await expectRevert(
                        stakingRewards.stake(toWei('0')),
                        'Cannot stake 0'
                    );
                });
            });
            context('» stake parameter is valid: stakes tokens', () => {
                before('!! fund accounts', async () => {
                    await stakingToken.transfer(accounts[1], stakeAmount, { from: governor });
                    await stakingToken.approve(stakingRewards.address, stakeAmount, { from: accounts[1] });
                    expect((await stakingToken.balanceOf(stakingRewards.address)).toString()).to.equal(toWei('0'));
                    expect((await stakingToken.balanceOf(accounts[1])).toString()).to.equal(stakeAmount);
                });
                it('stakes', async () => {
                    let tx = await stakingRewards.stake(stakeAmount, { from: accounts[1] });
                    await expectEvent.inTransaction(tx.tx, stakingRewards, 'Staked'); //tx # , contract, event (as string)
                    expect((await stakingToken.balanceOf(stakingRewards.address)).toString()).to.equal(stakeAmount);
                    expect((await stakingToken.balanceOf(accounts[1])).toString()).to.equal(toWei('0'));
                });
            });
        });
    });
    context('# withdraw', () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                stakingRewards = await GQC_Stake.new({ from: governor });
                rewardToken = await ERC20.new('Reward token', 'REWARD', { from: governor });
                stakingToken = await ERC20.new('Staking token', 'STAKING', { from: governor })
                stakeAmount = toWei('100');
                halfStake = toWei('50');
            });
            context('» withdraw parameter is not valid: too low', () => {
                before('!! fund & initialize contract', async () => {
                    await stakingRewards.GQC_Stake_init(governor, stakingToken.address, rewardToken.address, { from: governor });
                    await stakingRewards.setRewardDistribution(governor, { from: governor });
                    await rewardToken.transfer(stakingRewards.address, _initreward, { from: governor });
                    await stakingRewards.notifyRewardAmount(reward, expireAt, {from: governor});
                });
                it('it reverts', async () => {
                    await expectRevert(
                        stakingRewards.withdraw(),
                        'Cannot withdraw 0'
                    );
                });
            });
            context('» withdraw parameter is valid: withdraws entire stake', () => {
                before('!! fund accounts and stake', async () => {
                    await stakingToken.transfer(accounts[1], stakeAmount);
                    await stakingToken.approve(stakingRewards.address, stakeAmount, { from: accounts[1] });
                    await stakingRewards.stake(stakeAmount, { from: accounts[1] });
                });
                it('withdraws', async () => {
                    await time.increase(time.duration.seconds(11));
                    expect((await stakingToken.balanceOf(stakingRewards.address)).toString()).to.equal(stakeAmount);
                    stakeAmount = (BigInt(stakeAmount) * BigInt(99) / BigInt(100)).toString();
                    let tx = await stakingRewards.withdraw({ from: accounts[1] });
                    await expectEvent.inTransaction(tx.tx, stakingRewards, 'Withdrawn');
                    expect(BigInt(await stakingToken.balanceOf(accounts[1])).toString()).to.equal(stakeAmount);
                    expect(BigInt(await stakingToken.balanceOf(stakingRewards.address)).toString()).to.equal(toWei('0'));
                });
            });
        });
    });
    context('# getReward', () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                stakingRewards = await GQC_Stake.new({ from: governor });
                rewardToken = await ERC20.new('Reward token', 'REWARD', { from: governor });
                stakingToken = await ERC20.new('Staking token', 'STAKING', { from: governor })
                stakeAmount = toWei('100');
                rewardAmount = toWei('100');
            });
            context('» getReward param valid: rewards 0', async () => {
                before('!! fund & initialize contract', async () => {
                    await stakingRewards.GQC_Stake_init(governor, stakingToken.address, rewardToken.address, { from: governor });
                    await stakingRewards.setRewardDistribution(governor, { from: governor });
                    await rewardToken.transfer(stakingRewards.address, _initreward, { from: governor });
                    await stakingRewards.notifyRewardAmount(reward, expireAt, {from: governor});
                });
                it('rewards 0', async () => {
                    expect((await stakingRewards.earned(accounts[1])).toString()).to.equal(toWei('0'));
                    await stakingRewards.getReward( { from: accounts[1]} );
                    expect((await stakingRewards.earned(accounts[1])).toString()).to.equal(toWei('0'));
                });
            });
            context('» getReward param valid: rewards', async () => {
                before('!! fund accounts', async () => {
                    await stakingToken.transfer(accounts[1], stakeAmount);
                    await stakingToken.transfer(accounts[2], stakeAmount);
                    await stakingToken.approve(stakingRewards.address, stakeAmount, { from: accounts[1] });
                    await stakingToken.approve(stakingRewards.address, stakeAmount, { from: accounts[2] });
                    expect((await stakingToken.balanceOf(accounts[1])).toString()).to.equal(stakeAmount);
                    expect((await rewardToken.balanceOf(stakingRewards.address)).toString()).to.equal(_initreward);
                });
                it('rewards after time period', async () => {
                    /* not staked - no reward earned */
                    expect((await stakingRewards.earned(accounts[1])).toString()).to.equal(toWei('0'));
                    /* stake */
                    await stakingRewards.stake(stakeAmount, { from: accounts[1] });
                    await stakingRewards.stake(stakeAmount, { from: accounts[2] });
                    /* fast-forward 1 week */
                    await time.increase(time.duration.days(1));
                    let earned = BigInt(await stakingRewards.earned(accounts[1]));
                    let tx = await stakingRewards.getReward( { from: accounts[1] } );
                    await expectEvent.inTransaction(tx.tx, stakingRewards, 'RewardPaid');
                    let balance = BigInt(await rewardToken.balanceOf(accounts[1]));
                    expect(earned).to.equal(balance);
                });
            });
        });
    });
    context('# lastTimeRewardApplicable', async () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                stakingRewards = await GQC_Stake.new({ from: governor });
                rewardToken = await ERC20.new('Reward token', 'REWARD', { from: governor });
                stakingToken = await ERC20.new('Staking token', 'STAKING', { from: governor })
                stakeAmount = toWei('100');
                rewardAmount = toWei('100');
            });
            context('» lastTimeRewardApplicable returns smallest of timestamp & periodFinish', async () => {
                before('!! fund & initialize contract', async () => {
                    await stakingRewards.GQC_Stake_init(governor, stakingToken.address, rewardToken.address, { from: governor });
                    await stakingRewards.setRewardDistribution(governor, { from: governor });
                    await rewardToken.transfer(stakingRewards.address, _initreward, { from: governor });
                    await stakingRewards.notifyRewardAmount(reward, expireAt, {from: governor});
                    initTime = await time.latest();
                });
                it('returns block.timestamp', async () => {
                    let ltra = (await stakingRewards.lastTimeRewardApplicable()).toNumber();
                    expect(ltra).to.equal(initTime.toNumber());
                });
            });
        });
    });
    context('# balanceOf', () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                stakingRewards = await GQC_Stake.new({ from: governor });
                rewardToken = await ERC20.new('Reward token', 'REWARD', { from: governor });
                stakingToken = await ERC20.new('Staking token', 'STAKING', { from: governor })
                stakeAmount = toWei('100');
                rewardAmount = toWei('100');
            });
            context('» balanceOf', async () => {
                before('!! fund & initialize contract', async () => {
                    await stakingRewards.GQC_Stake_init(governor, stakingToken.address, rewardToken.address, { from: governor });
                    await stakingRewards.setRewardDistribution(governor, { from: governor });
                    await rewardToken.transfer(stakingRewards.address, _initreward, { from: governor });
                    await stakingRewards.notifyRewardAmount(reward, expireAt, {from: governor});
                });
                it('returns the staked balance of an account when stake == 0', async () => {
                    let stakingBal = await stakingRewards.balanceOf(accounts[1]);
                    expect(stakingBal.toString()).to.equal('0');
                });
                it('returns the staked balance of an account when staked', async () => {
                    await stakingToken.transfer(accounts[1], stakeAmount);
                    await stakingToken.approve(stakingRewards.address, stakeAmount, { from: accounts[1] });

                    await stakingRewards.stake(stakeAmount, {from: accounts[1]});
                    let stakingBal = await stakingRewards.balanceOf(accounts[1]);
                    expect(stakingBal.toString()).to.equal(stakeAmount);
                });
                it('updates balance when account withdraws', async () => {
                    await stakingRewards.withdraw({ from: accounts[1] });
                    let stakingBal = await stakingRewards.balanceOf(accounts[1]);
                    expect(stakingBal.toString()).to.equal('0');
                });
            });
        });
    });
    context('# totalSupply', () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                stakingRewards = await GQC_Stake.new({ from: governor });
                rewardToken = await ERC20.new('Reward token', 'REWARD', { from: governor });
                stakingToken = await ERC20.new('Staking token', 'STAKING', { from: governor })
                stakeAmount = toWei('100');
            });
            context('» totalSupply', async () => {
                before('!! fund & initialize contract', async () => {
                    await stakingRewards.GQC_Stake_init(governor, stakingToken.address, rewardToken.address, { from: governor });
                    await stakingRewards.setRewardDistribution(governor, { from: governor });
                    await rewardToken.transfer(stakingRewards.address, _initreward, { from: governor });
                    await stakingRewards.notifyRewardAmount(reward, expireAt, {from: governor});
                });
                it('_totalSupply == 0 before staking occurs', async () => {
                    let initialSupply = await stakingRewards.totalSupply();
                    expect(initialSupply.toString()).to.equal('0');
                });
                it('updates when user stakes', async () => {
                    await stakingToken.transfer(accounts[1], stakeAmount);
                    await stakingToken.approve(stakingRewards.address, stakeAmount, { from: accounts[1] });

                    await stakingRewards.stake(stakeAmount, {from: accounts[1]});
                    let totalSupply = await stakingRewards.totalSupply();
                    expect(totalSupply.toString()).to.equal(stakeAmount);
                });
                it('updates when user withdraws', async () => {
                    await stakingRewards.withdraw({ from: accounts[1] });
                    let totalSupply = await stakingRewards.totalSupply();
                    expect(totalSupply.toString()).to.equal('0');
                });
            });
        });
    });
});