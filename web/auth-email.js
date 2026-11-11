export function validateRegistration({name,email,password,confirmation}) {
  if(!name.trim()||name.trim().length>100)throw Error('Escribe tu nombre (máximo 100 caracteres).');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))throw Error('Escribe un correo válido.');
  if(password.length<8)throw Error('La contraseña debe tener al menos 8 caracteres.');
  if(password!==confirmation)throw Error('Las contraseñas no coinciden.');
  return {name:name.trim(),email:email.trim().toLowerCase(),password};
}
export function authErrorMessage(error) {
  const code=error?.code||'',message=error?.message||String(error||'');
  if(code==='email_address_not_authorized'||/email address not authorized/i.test(message))return 'El envío de correo sigue en modo de pruebas. El administrador debe conectar SMTP para confirmar correos externos.';
  if(code==='email_not_confirmed'||/email not confirmed/i.test(message))return 'Confirma primero tu correo. Si no encuentras el mensaje, usa Reenviar confirmación.';
  if(code==='over_email_send_rate_limit'||code==='over_request_rate_limit'||/rate limit|too many requests|security purposes/i.test(message))return 'Se alcanzó el límite temporal de envíos. Espera antes de volver a intentarlo.';
  if(code==='signup_disabled'||/signups not allowed/i.test(message))return 'El registro está temporalmente deshabilitado. Contacta al administrador.';
  if(code==='weak_password'||/password should|password must/i.test(message))return 'Elige una contraseña de al menos 8 caracteres que cumpla los requisitos indicados.';
  if(code==='invalid_credentials'||/invalid login credentials/i.test(message))return 'Correo o contraseña incorrectos.';
  if(code==='user_already_exists'||/already registered/i.test(message))return 'Si ya tienes una cuenta, inicia sesión o solicita reenviar la confirmación.';
  if(code==='email_address_invalid'||/invalid email/i.test(message))return 'Escribe una dirección de correo válida.';
  if(/sending confirmation email|error sending email|smtp/i.test(message))return 'No se pudo enviar la confirmación. Contacta al administrador para revisar el servicio de correo.';
  if(/failed to fetch|network|load failed/i.test(message))return 'No se pudo conectar. Revisa tu conexión a internet e inténtalo nuevamente.';
  return message||'No se pudo completar la solicitud. Inténtalo nuevamente.';
}

// No conserva contraseñas ni datos de registro en localStorage.
export function setupEmailRegistration({getClient,redirectTo}) {
  const $=id=>document.getElementById(id);
  let pendingEmail='',sending=false,nextSend=0,timer;
  const panels=['signin-panel','signup-panel','confirmation-panel','resend-panel'];
  function feedback(text,error=false){$('auth-feedback').textContent=text;$('auth-feedback').className='auth-feedback'+(error?' error':'');$('auth-feedback').hidden=!text;}
  function show(panel){
    panels.forEach(id=>$(id).hidden=id!==panel);
    const signing=panel==='signup-panel';
    $('show-signin').setAttribute('aria-pressed',String(panel==='signin-panel'));
    $('show-signup').setAttribute('aria-pressed',String(signing));
    $('auth-title').textContent=signing?'Crea tu cuenta':panel==='confirmation-panel'?'Revisa tu correo':panel==='resend-panel'?'Reenviar confirmación':'Inicia tu operación';
    $('auth-description').textContent=signing?'Regístrate y confirma tu correo para acceder como operador.':panel==='confirmation-panel'?'Abre el enlace de confirmación y vuelve a FlotaTrace.':panel==='resend-panel'?'Solicita un nuevo enlace para confirmar tu dirección.':'Ingresa con tu correo confirmado y tu contraseña.';
    feedback('');
    if(panel!=='signup-panel'){$('signup-password').value='';$('signup-confirm').value='';}
  }
  function startCooldown(){nextSend=Date.now()+60000;clearInterval(timer);const update=()=>{const remaining=Math.max(0,Math.ceil((nextSend-Date.now())/1000));$('resend-button').disabled=sending||remaining>0;$('resend-button').textContent=remaining?'Reenviar en '+remaining+' s':'Enviar nuevo enlace';if(!remaining)clearInterval(timer);};update();timer=setInterval(update,1000);}
  $('show-signin').onclick=()=>show('signin-panel');$('show-signup').onclick=()=>show('signup-panel');
  document.querySelectorAll('[data-auth-signin]').forEach(button=>button.onclick=()=>show('signin-panel'));
  document.querySelectorAll('[data-auth-resend]').forEach(button=>button.onclick=()=>{$('resend-email').value=pendingEmail||$('email').value.trim();show('resend-panel');});
  $('signup-form').onsubmit=async event=>{
    event.preventDefault();if(sending)return;feedback('');
    let input;
    try{input=validateRegistration({name:$('signup-name').value,email:$('signup-email').value,password:$('signup-password').value,confirmation:$('signup-confirm').value});}
    catch(error){feedback(error.message,true);return;}
    sending=true;$('signup-button').disabled=true;$('signup-button').textContent='Solicitando registro…';
    try{
      const client=getClient();
      const {data,error}=await client.auth.signUp({email:input.email,password:input.password,options:{emailRedirectTo:redirectTo,data:{display_name:input.name}}});
      if(error)throw error;
      // La aplicación exige confirmación aun si el proveedor se configurase mal.
      if(data.session){await client.auth.signOut();throw Error('El registro no exige confirmación de correo todavía. El administrador debe activar Confirm email en Supabase.');}
      pendingEmail=input.email;$('email').value=input.email;$('confirmation-email').textContent=input.email;
      $('signup-form').reset();show('confirmation-panel');
      feedback('Solicitud aceptada. Si corresponde un registro o confirmación pendiente, recibirás un enlace. Revisa también Spam. Si ya confirmaste tu cuenta, puedes iniciar sesión.');
      startCooldown();
    }catch(error){feedback(authErrorMessage(error),true);}
    finally{sending=false;$('signup-button').disabled=false;$('signup-button').textContent='Crear cuenta y enviar confirmación';}
  };
  $('resend-form').onsubmit=async event=>{
    event.preventDefault();if(sending||Date.now()<nextSend)return;feedback('');
    const email=$('resend-email').value.trim().toLowerCase();if(!email){feedback('Escribe tu correo.',true);return;}
    sending=true;$('resend-button').disabled=true;
    try{
      const {error}=await getClient().auth.resend({type:'signup',email,options:{emailRedirectTo:redirectTo}});if(error)throw error;
      pendingEmail=email;feedback('Si existe un registro pendiente para ese correo, recibirás un nuevo enlace de confirmación.');startCooldown();
    }catch(error){feedback(authErrorMessage(error),true);}
    finally{sending=false;$('resend-button').disabled=Date.now()<nextSend;}
  };
  return {showSignIn:()=>show('signin-panel'),showFeedback:feedback};
}
