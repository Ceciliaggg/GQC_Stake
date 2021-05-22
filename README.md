# GQC_Stake

主要逻辑：
用户存入GQC，挖WGCF。每天按照余额1%递减销毁GQC，用户可随时提取本金和收益。管理员也可随时调整收益。

核心函数说明：
LPTokenWrapper.sol
afterBurnBalanceOf(address account): 获取账号销毁后的余额，由于销毁不是实时销毁，因此需要算出来。使用for循坏是考虑当天数太大，用幂运算可能会有uint256溢出问题
updateBurned(bool isExit): 更新销毁数据，如果是withdraw，则把当前天（未满一天）也当作一天计算

GQC_Stake.sol

rewardPerToken(): 更新每个Token 收益
earned(address account)：获取账号当前可提收益
stake(uint256 amount): 抵押amount 个 GQC
withdraw(): 提取所有本金
getReward(): 获取收益
notifyRewardAmount(uint256 rewardPerDay, uint256 expireAt): 管理员调整收益
getStakeInfo(address account): 根据业务一次查询前端所需信息
