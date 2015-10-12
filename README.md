腾讯 音视频云通信
服务器端DEMO

   install dependencies:
     $ cd . && npm install

   run the app:
     $ DEBUG=qav-api:* npm start


#user/volunteer login取得qav的id和sig
http://ctalk2/tttalk150806/user/user_login.php?encrypt=true&loginid=4638&password=*89C6B530AA78695E257E55D63C00A6EC9AD3E977&qav=true&serial=42f6a616add0bfc9&sign=991d6126e54f3e4abdb9bd393e554309eed36ce4&source=ttt-2015082415&username=oizhaolei%40gmail.com
对user_login.php/volunteer_login.php的返回结果进行扩展
REQ: qav=true
RES: qav_id, qav_sig

http://ctalk2/tttalk.web/v3.1/volunteer_login.php?encrypt=true&loginid=2074&password=*89C6B530AA78695E257E55D63C00A6EC9AD3E977&qav=true&sign=d37d6422dfaaa56d6a486d847916ce4109653b60&source=an-2015073107&username=oizhaolei....%40gmail.com

# volunteer online
http://211.149.218.190:5000/volunteer/online?loginid=2074

# volunteer offline
http://211.149.218.190:5000/volunteer/offline?loginid=2074

# conversation
http://211.149.218.190:5000/conversations/12

# user request service
http://211.149.218.190:5000/conversation/request?lang1=CN&lang2=EN&loginid=4638

# user conversation begin
http://211.149.218.190:5000/conversation/begin?conversation_id=17&agent_emp_id=2074

# user conversation end -> online
http://211.149.218.190:5000/conversation/end?conversation_id=17

# volunteer charge begin
http://211.149.218.190:5000/charge/begin?conversation_id=100

# volunteer charge end
http://211.149.218.190:5000/charge/end?conversation_id=100&charge_length=11

# volunteer charge update
http://211.149.218.190:5000/charge/update?conversation_id=100&charge_length=11

# user charge confirm
http://211.149.218.190:5000/charge/confirm?conversation_id=100

# user feedback
http://211.149.218.190:5000/conversation/user_feedback?id=17&network_star=1&peer_star=1&comment=XXX
# volunteer feedback
http://211.149.218.190:5000/conversation/translator_feedback?id=17&network_star=2&peer_star=2&comment=XXX
